/* eslint prefer-template: 0 */

import accepts from 'attr-accept';
import React from 'react';

const supportMultiple = (typeof document !== 'undefined' && document && document.createElement) ?
  'multiple' in document.createElement('input') :
  true;

const walkDirectory = Symbol('walk directory');
const readEntries = Symbol('read entries');
const toArray = Symbol('to array');

class Dropzone extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.onClick = this.onClick.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragEnter = this.onDragEnter.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onFileDialogCancel = this.onFileDialogCancel.bind(this);
    this.fileAccepted = this.fileAccepted.bind(this);
    this.isFileDialogActive = false;
    this.state = {
      isDragActive: false
    };
  }

  componentDidMount() {
    const { multiple } = this.props;

    this.enterCounter = 0;

    if (supportMultiple && multiple) {
      // see https://github.com/okonet/react-dropzone/issues/134#issuecomment-206442049
      ['webkitdirectory', 'mozdirectory', 'msdirectory', 'odirectory', 'directory'].forEach(attribute => {
        this.fileInputEl.setAttribute(attribute, true);
      });
    }

    // Tried implementing addEventListener, but didn't work out
    document.body.onfocus = this.onFileDialogCancel;
  }

  componentWillUnmount() {
    // Can be replaced with removeEventListener, if addEventListener works
    document.body.onfocus = null;
  }

  onDragStart(e) {
    if (this.props.onDragStart) {
      this.props.onDragStart.call(this, e);
    }
  }

  onDragEnter(e) {
    e.preventDefault();

    // Count the dropzone and any children that are entered.
    ++this.enterCounter;

    // This is tricky. During the drag even the dataTransfer.files is null
    // But Chrome implements some drag store, which is accesible via dataTransfer.items
    const dataTransferItems = e.dataTransfer && e.dataTransfer.items ? e.dataTransfer.items : [];

    // Now we need to convert the DataTransferList to Array
    const allFilesAccepted = this.allFilesAccepted(Array.prototype.slice.call(dataTransferItems));

    this.setState({
      isDragActive: allFilesAccepted,
      isDragReject: !allFilesAccepted
    });

    if (this.props.onDragEnter) {
      this.props.onDragEnter.call(this, e);
    }
  }

  onDragOver(e) { // eslint-disable-line class-methods-use-this
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = 'copy'; // eslint-disable-line no-param-reassign
    } catch (err) {
      // continue regardless of error
    }
    return false;
  }

  onDragLeave(e) {
    e.preventDefault();

    // Only deactivate once the dropzone and all children was left.
    if (--this.enterCounter > 0) {
      return;
    }

    this.setState({
      isDragActive: false,
      isDragReject: false
    });

    if (this.props.onDragLeave) {
      this.props.onDragLeave.call(this, e);
    }
  }

  onDrop(e) {
    e.preventDefault();

    // Reset the counter along with the drag on a drop.
    this.enterCounter = 0;

    this.setState({
      isDragActive: false,
      isDragReject: false
    });

    let droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    const dataTransferItems = e.dataTransfer && e.dataTransfer.items ? e.dataTransfer.items : [];

    const processDrop = () => {
      const {
        disablePreview,
        multiple,
        onDrop,
        onDropAccepted,
        onDropRejected
      } = this.props;
      const max = multiple ? droppedFiles.length : Math.min(droppedFiles.length, 1);
      const acceptedFiles = [];
      const rejectedFiles = [];

      for (let i = 0; i < max; i++) {
        const file = droppedFiles[i];

        if (!this.fileAccepted(file) || !this.fileMatchSize(file)) {
          rejectedFiles.push(file);
          continue;
        }

        // We might want to disable the preview creation to support big files
        if (!disablePreview) {
          file.preview = window.URL.createObjectURL(file);
        }
        acceptedFiles.push(file);
      }

      if (onDrop) {
        onDrop.call(this, acceptedFiles, rejectedFiles, e);
      }

      if (onDropRejected && rejectedFiles.length) {
        onDropRejected.call(this, rejectedFiles, e);
      }
      if (onDropAccepted && acceptedFiles.length) {
        onDropAccepted.call(this, acceptedFiles, e);
      }
    };

    if (dataTransferItems[0] && typeof dataTransferItems[0].webkitGetAsEntry === 'function') {
      const entry = dataTransferItems[0].webkitGetAsEntry();

      return this[walkDirectory](entry.filesystem.root, walkedFiles => {
        droppedFiles = walkedFiles;
        processDrop();
      });
    }
    processDrop();
    this.isFileDialogActive = false;
    return false;
  }

  onClick() {
    if (!this.props.disableClick) {
      this.open();
    }
  }

  onFileDialogCancel() {
    // timeout will not recognize context of this method
    const { onFileDialogCancel } = this.props;
    const { fileInputEl } = this;
    let { isFileDialogActive } = this;
    // execute the timeout only if the onFileDialogCancel is defined and FileDialog
    // is opened in the browser
    if (onFileDialogCancel && isFileDialogActive) {
      setTimeout(() => {
        // Returns an object as FileList
        const FileList = fileInputEl.files;
        if (!FileList.length) {
          isFileDialogActive = false;
          onFileDialogCancel();
        }
      }, 300);
    }
  }

  fileAccepted(file) {
    return accepts(file, this.props.accept);
  }

  fileMatchSize(file) {
    return file.size <= this.props.maxSize && file.size >= this.props.minSize;
  }

  allFilesAccepted(files) {
    return files.every(this.fileAccepted);
  }

  open() {
    this.isFileDialogActive = true;
    this.fileInputEl.value = null;
    this.fileInputEl.click();
  }

  [walkDirectory](directory, callback) {
    let results = [];

    if (directory === null) {
      return callback(results);
    }

    return this[readEntries](directory, (err, result) => {
      if (err) {
        return callback(err);
      }

      const entries = result.slice();

      const processEntry = () => {
        const current = entries.shift();

        if (current === undefined) {
          return callback(results);
        }

        if (current.isDirectory) {
          return this[walkDirectory](current, nestedResults => {
            results = results.concat(nestedResults);
            processEntry();
          });
        }

        return current.file(file => {
          results.push(file);
          return processEntry();
        }, processEntry);
      };
      return processEntry();
    });
  }

  [readEntries](directory, callback, readerSupplied) {
    let entries = [];
    // reader should not be present on initial call
    const reader = readerSupplied || directory.createReader();

    return reader.readEntries(results => {
      if (!results.length) {
        return callback(null, entries);
      }

      entries = entries.concat(this[toArray](results));
      return this[readEntries](directory, (err, additionalEntries) => {
        if (err) {
          return callback(err);
        }

        entries = entries.concat(additionalEntries);
        return callback(null, entries);
      }, reader);
    }, callback);
  }

  [toArray](obj) {
    return Array.prototype.slice.call(obj || [], 0);
  }

  render() {
    const {
      accept,
      activeClassName,
      inputProps,
      multiple,
      name,
      rejectClassName,
      ...rest
    } = this.props;

    let {
      activeStyle,
      className,
      rejectStyle,
      style,
      ...props // eslint-disable-line prefer-const
    } = rest;

    const { isDragActive, isDragReject } = this.state;

    className = className || '';

    if (isDragActive && activeClassName) {
      className += ' ' + activeClassName;
    }
    if (isDragReject && rejectClassName) {
      className += ' ' + rejectClassName;
    }

    if (!className && !style && !activeStyle && !rejectStyle) {
      style = {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: '#666',
        borderStyle: 'dashed',
        borderRadius: 5
      };
      activeStyle = {
        borderStyle: 'solid',
        backgroundColor: '#eee'
      };
      rejectStyle = {
        borderStyle: 'solid',
        backgroundColor: '#ffdddd'
      };
    }

    let appliedStyle;
    if (activeStyle && isDragActive) {
      appliedStyle = {
        ...style,
        ...activeStyle
      };
    } else if (rejectStyle && isDragReject) {
      appliedStyle = {
        ...style,
        ...rejectStyle
      };
    } else {
      appliedStyle = {
        ...style
      };
    }

    const inputAttributes = {
      accept,
      type: 'file',
      style: { display: 'none' },
      multiple: supportMultiple && multiple,
      ref: el => this.fileInputEl = el, // eslint-disable-line
      onChange: this.onDrop
    };

    if (name && name.length) {
      inputAttributes.name = name;
    }

    // Remove custom properties before passing them to the wrapper div element
    const customProps = [
      'acceptedFiles',
      'disablePreview',
      'disableClick',
      'onDropAccepted',
      'onDropRejected',
      'onFileDialogCancel',
      'maxSize',
      'minSize'
    ];
    const divProps = { ...props };
    customProps.forEach(prop => delete divProps[prop]);

    return (
      <div
        className={className}
        style={appliedStyle}
        {...divProps/* expand user provided props first so event handlers are never overridden */}
        onClick={this.onClick}
        onDragStart={this.onDragStart}
        onDragEnter={this.onDragEnter}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}
      >
        {this.props.children}
        <input
          {...inputProps/* expand user provided inputProps first so inputAttributes override them */}
          {...inputAttributes}
        />
      </div>
    );
  }
}

Dropzone.defaultProps = {
  disablePreview: false,
  disableClick: false,
  multiple: true,
  maxSize: Infinity,
  minSize: 0
};

Dropzone.propTypes = {
  // Overriding drop behavior
  onDrop: React.PropTypes.func,
  onDropAccepted: React.PropTypes.func,
  onDropRejected: React.PropTypes.func,

  // Overriding drag behavior
  onDragStart: React.PropTypes.func,
  onDragEnter: React.PropTypes.func,
  onDragLeave: React.PropTypes.func,

  children: React.PropTypes.node, // Contents of the dropzone
  style: React.PropTypes.object, // CSS styles to apply
  activeStyle: React.PropTypes.object, // CSS styles to apply when drop will be accepted
  rejectStyle: React.PropTypes.object, // CSS styles to apply when drop will be rejected
  className: React.PropTypes.string, // Optional className
  activeClassName: React.PropTypes.string, // className for accepted state
  rejectClassName: React.PropTypes.string, // className for rejected state

  disablePreview: React.PropTypes.bool, // Enable/disable preview generation
  disableClick: React.PropTypes.bool, // Disallow clicking on the dropzone container to open file dialog
  onFileDialogCancel: React.PropTypes.func, // Provide a callback on clicking the cancel button of the file dialog

  inputProps: React.PropTypes.object, // Pass additional attributes to the <input type="file"/> tag
  multiple: React.PropTypes.bool, // Allow dropping multiple files
  accept: React.PropTypes.string, // Allow specific types of files. See https://github.com/okonet/attr-accept for more information
  name: React.PropTypes.string, // name attribute for the input tag
  maxSize: React.PropTypes.number,
  minSize: React.PropTypes.number
};

export default Dropzone;
