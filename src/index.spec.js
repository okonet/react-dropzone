/* eslint jsx-a11y/click-events-have-key-events: 0 */
/* eslint jsx-a11y/no-static-element-interactions: 0 */

import React from 'react'
import { mount, render } from 'enzyme'
import { spy, stub } from 'sinon'
import { onDocumentDragOver } from './utils'

const flushPromises = wrapper =>
  new Promise(resolve =>
    global.setImmediate(() => {
      wrapper.update()
      resolve(wrapper)
    })
  )
const Dropzone = require('./index')
const DummyChildComponent = () => null

let files
let images

const rejectColor = 'red'
const acceptColor = 'green'

const rejectStyle = {
  color: rejectColor,
  borderColor: 'black'
}

const acceptStyle = {
  color: acceptColor,
  borderWidth: '5px'
}

describe('Dropzone', () => {
  beforeEach(() => {
    files = [
      {
        name: 'file1.pdf',
        size: 1111,
        type: 'application/pdf'
      }
    ]

    images = [
      {
        name: 'cats.gif',
        size: 1234,
        type: 'image/gif'
      },
      {
        name: 'dogs.jpg',
        size: 2345,
        type: 'image/jpeg'
      }
    ]
  })

  describe('basics', () => {
    it('should render children', () => {
      const dropzone = mount(
        <Dropzone>
          <p>some content</p>
        </Dropzone>
      )
      expect(dropzone.html()).toMatchSnapshot()
    })

    it('should render an input HTML element', () => {
      const dropzone = mount(
        <Dropzone>
          <p>some content</p>
        </Dropzone>
      )
      expect(dropzone.find('input').length).toEqual(1)
    })

    it('sets ref properly', () => {
      const dropzone = mount(<Dropzone />)
      expect(dropzone.instance().fileInputEl).not.toBeUndefined()
      expect(dropzone.instance().fileInputEl.tagName).toEqual('INPUT')
    })

    it('renders dynamic props on the root element', () => {
      const component = mount(<Dropzone hidden aria-hidden title="Dropzone" />)
      expect(component.html()).toContain('aria-hidden="true"')
      expect(component.html()).toContain('hidden=""')
      expect(component.html()).toContain('title="Dropzone"')
    })

    it('renders dynamic props on the input element', () => {
      const component = mount(<Dropzone inputProps={{ id: 'hiddenFileInput' }} />)
      expect(component.find('input').html()).toContain('id="hiddenFileInput"')
    })

    it('applies the accept prop to the child input', () => {
      const component = render(<Dropzone className="my-dropzone" accept="image/jpeg" />)

      expect(component.attr()).not.toContain('accept')
      expect(Object.keys(component.find('input').attr())).toContain('accept')
      expect(component.find('input').attr('accept')).toEqual('image/jpeg')
    })

    it('applies the name prop to the child input', () => {
      const component = render(<Dropzone className="my-dropzone" name="test-file-input" />)
      expect(component.attr()).not.toContain('name')
      expect(Object.keys(component.find('input').attr())).toContain('name')
      expect(component.find('input').attr('name')).toEqual('test-file-input')
    })

    it('should render children function', () => {
      const content = <p>some content</p>
      const dropzone = mount(<Dropzone>{content}</Dropzone>)
      const dropzoneWithFunction = mount(<Dropzone>{() => content}</Dropzone>)
      expect(dropzoneWithFunction.html()).toEqual(dropzone.html())
    })
  })

  describe('document drop protection', () => {
    let dropzone
    let addEventCalls
    let savedAddEventListener
    let savedRemoveEventListener

    beforeEach(() => {
      savedAddEventListener = document.addEventListener
      savedRemoveEventListener = document.removeEventListener
      document.addEventListener = spy()
      document.removeEventListener = spy()
    })

    afterEach(() => {
      document.addEventListener = savedAddEventListener
      document.removeEventListener = savedRemoveEventListener
    })

    // Collect the list of addEventListener/removeEventListener spy calls into an object keyed by event name.
    function collectEventListenerCalls(calls) {
      return calls.reduce((acc, [eventName, ...rest]) => {
        acc[eventName] = rest // eslint-disable-line no-param-reassign
        return acc
      }, {})
    }

    it('installs hooks to prevent stray drops from taking over the browser window', () => {
      dropzone = mount(
        <Dropzone>
          <p>Content</p>
        </Dropzone>
      )
      expect(dropzone.html()).toMatchSnapshot()
      expect(document.addEventListener.callCount).toEqual(2)
      addEventCalls = collectEventListenerCalls(document.addEventListener.args)
      Object.keys(addEventCalls).forEach(eventName => {
        expect(addEventCalls[eventName][0]).toBeDefined()
        expect(addEventCalls[eventName][1]).toBe(false)
      })
    })

    it('terminates drags and drops on elements outside our dropzone', () => {
      const event = { preventDefault: spy() }
      onDocumentDragOver(event)
      expect(event.preventDefault.callCount).toEqual(1)
      event.preventDefault.reset()

      dropzone.instance().onDocumentDrop(event)
      expect(event.preventDefault.callCount).toEqual(1)
    })

    it('permits drags and drops on elements inside our dropzone', () => {
      const instanceEvent = {
        preventDefault: spy(),
        target: dropzone.getDOMNode()
      }
      dropzone.instance().onDocumentDrop(instanceEvent)
      expect(instanceEvent.preventDefault.callCount).toEqual(0)
    })

    it('removes document hooks when unmounted', () => {
      dropzone.unmount()
      expect(document.removeEventListener.callCount).toEqual(2)
      const removeEventCalls = collectEventListenerCalls(document.removeEventListener.args)
      Object.keys(addEventCalls).forEach(eventName => {
        expect(removeEventCalls[eventName][0]).toEqual(addEventCalls[eventName][0])
      })
    })

    it('does not prevent stray drops when preventDropOnDocument is false', () => {
      dropzone = mount(<Dropzone preventDropOnDocument={false} />)
      expect(dropzone.html()).toMatchSnapshot()
      expect(document.addEventListener.callCount).toEqual(0)

      dropzone.unmount()
      expect(document.removeEventListener.callCount).toEqual(0)
    })
  })

  describe('onClick', () => {
    it('should call `open` method', done => {
      const dropzone = mount(<Dropzone />)
      spy(dropzone.instance(), 'open')
      dropzone.simulate('click')
      setTimeout(() => {
        expect(dropzone.instance().open.callCount).toEqual(1)
        done()
      }, 0)
    })

    it('should not call `open` if disableClick prop is true', () => {
      const dropzone = mount(<Dropzone disableClick />)
      spy(dropzone.instance(), 'open')
      dropzone.simulate('click')
      expect(dropzone.instance().open.callCount).toEqual(0)
    })

    it('should call `onClick` callback if provided', done => {
      const clickSpy = spy()
      const dropzone = mount(<Dropzone onClick={clickSpy} />)
      spy(dropzone.instance(), 'open')
      dropzone.simulate('click')
      setTimeout(() => {
        expect(dropzone.instance().open.callCount).toEqual(1)
        expect(clickSpy.callCount).toEqual(1)
        done()
      }, 0)
    })

    it('should reset the value of input', () => {
      const dropzone = mount(<Dropzone />)
      expect(
        dropzone
          .render()
          .find('input')
          .attr('value')
      ).toBeUndefined()
      expect(
        dropzone
          .render()
          .find('input')
          .attr('value', 10)
      ).not.toBeUndefined()
      dropzone.simulate('click')
      expect(
        dropzone
          .render()
          .find('input')
          .attr('value')
      ).toBeUndefined()
    })

    it('should trigger click even on the input', done => {
      const dropzone = mount(<Dropzone />)
      const clickSpy = spy(dropzone.instance().fileInputEl, 'click')
      dropzone.simulate('click')
      dropzone.simulate('click')
      setTimeout(() => {
        expect(clickSpy.callCount).toEqual(2)
        done()
      }, 0)
    })

    it('should not invoke onClick on the wrapper', () => {
      const onClickOuterSpy = spy()
      const onClickInnerSpy = spy()
      const component = mount(
        <div onClick={onClickOuterSpy}>
          <Dropzone onClick={onClickInnerSpy} />
        </div>
      )

      component.simulate('click')
      expect(onClickOuterSpy.callCount).toEqual(1)
      expect(onClickInnerSpy.callCount).toEqual(0)

      onClickOuterSpy.reset()
      onClickInnerSpy.reset()

      component.find(Dropzone).simulate('click')
      expect(onClickOuterSpy.callCount).toEqual(0)
      expect(onClickInnerSpy.callCount).toEqual(1)
    })

    it('should invoke onClick on the wrapper if disableClick is set', () => {
      const onClickOuterSpy = spy()
      const component = mount(
        <div onClick={onClickOuterSpy}>
          <Dropzone disableClick />
        </div>
      )

      component.find(Dropzone).simulate('click')
      expect(onClickOuterSpy.callCount).toEqual(1)
    })

    it('should invoke inputProps onClick if provided', done => {
      const inputPropsClickSpy = spy()
      const component = mount(<Dropzone inputProps={{ onClick: inputPropsClickSpy }} />)

      component.simulate('click')
      setTimeout(() => {
        expect(inputPropsClickSpy.callCount).toEqual(1)
        done()
      }, 0)
    })
  })

  describe('drag-n-drop', () => {
    it('should override onDrag* methods', () => {
      const dragStartSpy = spy()
      const dragEnterSpy = spy()
      const dragOverSpy = spy()
      const dragLeaveSpy = spy()
      const component = mount(
        <Dropzone
          onDragStart={dragStartSpy}
          onDragEnter={dragEnterSpy}
          onDragOver={dragOverSpy}
          onDragLeave={dragLeaveSpy}
        />
      )
      component.simulate('dragStart')
      component.simulate('dragEnter', { dataTransfer: { items: files } })
      component.simulate('dragOver', { dataTransfer: { items: files } })
      component.simulate('dragLeave', { dataTransfer: { items: files } })
      expect(dragStartSpy.callCount).toEqual(1)
      expect(dragEnterSpy.callCount).toEqual(1)
      expect(dragOverSpy.callCount).toEqual(1)
      expect(dragLeaveSpy.callCount).toEqual(1)
    })

    it('should guard dropEffect in onDragOver for IE', () => {
      const dragStartSpy = spy()
      const dragEnterSpy = spy()
      const dragLeaveSpy = spy()
      const component = mount(
        <Dropzone
          onDragStart={dragStartSpy}
          onDragEnter={dragEnterSpy}
          onDragLeave={dragLeaveSpy}
        />
      )

      // Using Proxy we'll emulate IE throwing when setting dataTransfer.dropEffect
      const eventProxy = new Proxy(
        {},
        {
          get: (target, prop) => {
            switch (prop) {
              case 'dataTransfer':
                throw new Error('IE does not support rrror')
              default:
                return function noop() {}
            }
          }
        }
      )

      // And using then we'll call the onDragOver with the proxy instead of event
      const dragOverSpy = stub(component.instance(), 'onDragOver').callsFake(
        component.instance().onDragOver(eventProxy)
      )

      component.simulate('dragStart', { dataTransfer: { items: files } })
      component.simulate('dragEnter', { dataTransfer: { items: files } })
      component.simulate('dragOver', { dataTransfer: { items: files } })
      component.simulate('dragLeave', { dataTransfer: { items: files } })
      expect(dragStartSpy.callCount).toEqual(1)
      expect(dragEnterSpy.callCount).toEqual(1)
      expect(dragLeaveSpy.callCount).toEqual(1)
      // It should not throw the error
      expect(dragOverSpy).not.toThrow()
      dragOverSpy.restore()
    })

    it('should set proper dragActive state on dragEnter', async () => {
      const dropzone = mount(<Dropzone>{props => <DummyChildComponent {...props} />}</Dropzone>)
      dropzone.simulate('dragEnter', { dataTransfer: { files } })

      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)

      expect(child).toHaveProp('isDragActive', true)
      expect(child).toHaveProp('isDragAccept', true)
      expect(child).toHaveProp('isDragReject', false)
    })

    it('should set proper dragReject state on dragEnter', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*">{props => <DummyChildComponent {...props} />}</Dropzone>
      )
      dropzone.simulate('dragEnter', {
        dataTransfer: { files: files.concat(images) }
      })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragActive', true)
      expect(child).toHaveProp('isDragAccept', false)
      expect(child).toHaveProp('isDragReject', true)
    })

    it('should set proper dragAccept state if multiple is false', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*" multiple={false}>
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files } })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragActive', true)
      expect(child).toHaveProp('isDragAccept', false)
      expect(child).toHaveProp('isDragReject', true)
    })

    it('should set proper dragAccept state if multiple is false', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*" multiple={false}>
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragActive', true)
      expect(child).toHaveProp('isDragAccept', true)
      expect(child).toHaveProp('isDragReject', true)
    })

    it('should set activeClassName properly', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*" activeClassName="👏" multiple={false}>
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragActive', true)
      expect(
        dropzone
          .children()
          .first()
          .hasClass('👏')
      ).toBe(true)
    })

    it('should set rejectClassName properly', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*" rejectClassName="👎" multiple={false}>
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragReject', true)
      expect(
        dropzone
          .children()
          .first()
          .hasClass('👎')
      ).toBe(true)
    })

    it('should set acceptClassName properly', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*" acceptClassName="👍" className="foo" multiple={false}>
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      const child = updatedDropzone.find(DummyChildComponent)
      expect(child).toHaveProp('isDragAccept', true)
      expect(
        updatedDropzone
          .children()
          .first()
          .hasClass('👍')
      ).toBe(true)
    })

    it('should set disabledClassName properly', () => {
      const dropzone = render(
        <Dropzone disabled disabledClassName="🤐">
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      expect(dropzone.hasClass('🤐')).toBe(true)
    })

    it('should keep dragging active when leaving from arbitrary node', async () => {
      const arbitraryOverlay = mount(<div />)
      const dropzone = mount(<Dropzone>{props => <DummyChildComponent {...props} />}</Dropzone>)
      await dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      dropzone.simulate('dragLeave', { target: arbitraryOverlay })
      expect(dropzone.state('isDragActive')).toBe(true)
      expect(dropzone.state('draggedFiles').length > 0).toBe(true)
    })

    it('should apply acceptStyle if multiple is false and single file', async () => {
      const dropzone = mount(
        <Dropzone
          accept="image/*"
          multiple={false}
          acceptStyle={acceptStyle}
          rejectStyle={rejectStyle}
        >
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: [images[0]] } })
      const updatedDropzone = await flushPromises(dropzone)
      const mainDiv = updatedDropzone.find('div').at(0)
      expect(mainDiv).toHaveProp('style', { position: 'relative', ...acceptStyle })
    })

    it('should apply rejectStyle if multiple is false and single bad file type', async () => {
      const dropzone = mount(
        <Dropzone
          accept="image/*"
          multiple={false}
          acceptStyle={acceptStyle}
          rejectStyle={rejectStyle}
        >
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: [files[0]] } })
      const updatedDropzone = await flushPromises(dropzone)
      const mainDiv = updatedDropzone.find('div').at(0)
      expect(mainDiv).toHaveProp('style', { position: 'relative', ...rejectStyle })
    })

    it('should apply acceptStyle + rejectStyle if multiple is false and multiple good file types', async () => {
      const dropzone = mount(
        <Dropzone
          accept="image/*"
          multiple={false}
          acceptStyle={acceptStyle}
          rejectStyle={rejectStyle}
        >
          {props => <DummyChildComponent {...props} />}
        </Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      const mainDiv = updatedDropzone.find('div').at(0)
      const expectedStyle = {
        position: 'relative',
        ...acceptStyle,
        ...rejectStyle
      }
      expect(mainDiv).toHaveProp('style', expectedStyle)
    })

    it('should set proper dragActive state if accept prop changes mid-drag', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*">{props => <DummyChildComponent {...props} />}</Dropzone>
      )
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      const updatedDropzone = await flushPromises(dropzone)
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragActive', true)
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragAccept', true)
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragReject', false)

      dropzone.setProps({ accept: 'text/*' })
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragActive', true)
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragAccept', false)
      expect(updatedDropzone.find(DummyChildComponent)).toHaveProp('isDragReject', true)
    })

    it('should expose state to children', async () => {
      const dropzone = mount(
        <Dropzone accept="image/*">
          {({ isDragActive, isDragAccept, isDragReject }) => {
            if (isDragReject) {
              return `${isDragActive && 'Active but'} Reject`
            }
            if (isDragAccept) {
              return `${isDragActive && 'Active and'} Accept`
            }
            return 'Empty'
          }}
        </Dropzone>
      )
      expect(dropzone.text()).toEqual('Empty')
      await dropzone.simulate('dragEnter', { dataTransfer: { files: images } })
      expect(dropzone.text()).toEqual('Active and Accept')
      await dropzone.simulate('dragEnter', { dataTransfer: { files } })
      expect(dropzone.text()).toEqual('Active but Reject')
    })

    it('should reset the dragAccept/dragReject state when leaving after a child goes away', async () => {
      const DragActiveComponent = () => <p>Accept</p>
      const ChildComponent = () => <p>Child component content</p>
      const dropzone = mount(
        <Dropzone>
          {({ isDragAccept, isDragReject }) => {
            if (isDragReject) {
              return 'Rejected'
            }
            if (isDragAccept) {
              return <DragActiveComponent isDragAccept={isDragAccept} isDragReject={isDragReject} />
            }
            return <ChildComponent isDragAccept={isDragAccept} isDragReject={isDragReject} />
          }}
        </Dropzone>
      )
      const child = dropzone.find(ChildComponent)
      child.simulate('dragEnter', { dataTransfer: { files } })
      await dropzone.simulate('dragEnter', { dataTransfer: { files } })
      // make sure we handle any duplicate dragEnter events that the browser may send us
      await dropzone.simulate('dragEnter', { dataTransfer: { files } })
      const dragActiveChild = dropzone.find(DragActiveComponent)
      expect(dragActiveChild).toExist()
      expect(dragActiveChild).toHaveProp('isDragAccept', true)
      expect(dragActiveChild).toHaveProp('isDragReject', false)

      dropzone.simulate('dragLeave', { dataTransfer: { files } })
      expect(dropzone.find(DragActiveComponent).children()).toHaveLength(0)
      expect(dropzone.find(ChildComponent)).toHaveProp('isDragAccept', false)
      expect(dropzone.find(ChildComponent)).toHaveProp('isDragReject', false)
    })
  })

  describe('onDrop', () => {
    const expectedEvent = expect.anything()
    const onDrop = jest.fn()
    const onDropAccepted = jest.fn()
    const onDropRejected = jest.fn()

    it('should reset the dragActive/dragReject state', async () => {
      let dropzone = mount(<Dropzone>{props => <DummyChildComponent {...props} />}</Dropzone>)
      dropzone.simulate('dragEnter', { dataTransfer: { files } })
      dropzone = await flushPromises(dropzone)
      expect(dropzone.find(DummyChildComponent)).toHaveProp('isDragActive', true)
      expect(dropzone.find(DummyChildComponent)).toHaveProp('isDragReject', false)
      dropzone.simulate('drop', { dataTransfer: { files } })
      dropzone = await flushPromises(dropzone)
      expect(dropzone.find(DummyChildComponent)).toHaveProp('isDragActive', false)
      expect(dropzone.find(DummyChildComponent)).toHaveProp('isDragReject', false)
    })

    it('should reject invalid file when multiple is false', async () => {
      const dropzone = mount(<Dropzone accept="image/*" onDrop={onDrop} multiple={false} />)
      await dropzone.simulate('drop', {
        dataTransfer: { files }
      })
      expect(onDrop).toHaveBeenCalledWith([], files, expectedEvent)
    })

    it('should allow single files to be dropped if multiple is false', async () => {
      const dropzone = mount(<Dropzone accept="image/*" onDrop={onDrop} multiple={false} />)

      await dropzone.simulate('drop', { dataTransfer: { files: [images[0]] } })
      expect(onDrop).toHaveBeenCalledWith([images[0]], [], expectedEvent)
    })

    it('should reject multiple files to be dropped if multiple is false', async () => {
      const dropzone = mount(<Dropzone accept="image/*" onDrop={onDrop} multiple={false} />)

      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith([], images, expectedEvent)
    })

    it('should take all dropped files if multiple is true', async () => {
      const dropzone = mount(<Dropzone onDrop={onDrop} multiple />)
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith(images, [], expectedEvent)
    })

    it('should set this.isFileDialogActive to false', async () => {
      const dropzone = mount(<Dropzone />)
      dropzone.instance().isFileDialogActive = true
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(dropzone.instance().isFileDialogActive).toEqual(false)
    })

    it('should always call onDrop callback with accepted and rejected arguments', async () => {
      const dropzone = mount(<Dropzone onDrop={onDrop} accept="image/*" />)
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDrop).toHaveBeenCalledWith([], files, expectedEvent)
      onDrop.mockClear()

      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith(images, [], expectedEvent)
      onDrop.mockClear()

      await dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      })
      expect(onDrop).toHaveBeenCalledWith(images, files, expectedEvent)
    })

    it('should call onDropAccepted callback if some files were accepted', async () => {
      const dropzone = mount(<Dropzone onDropAccepted={onDropAccepted} accept="image/*" />)
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDropAccepted).not.toHaveBeenCalled()
      onDropAccepted.mockClear()

      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
      onDropAccepted.mockClear()

      await dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      })
      expect(onDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
    })

    it('should call onDropRejected callback if some files were rejected', async () => {
      const dropzone = mount(<Dropzone onDropRejected={onDropRejected} accept="image/*" />)
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDropRejected).not.toHaveBeenCalled()
      onDropRejected.mockClear()

      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDropRejected).toHaveBeenCalledWith(files, expectedEvent)
      onDropRejected.mockClear()

      await dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      })
      expect(onDropRejected).toHaveBeenCalledWith(files, expectedEvent)
    })

    it('applies the accept prop to the dropped files', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          accept="image/*"
        />
      )
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDrop).toHaveBeenCalledWith([], files, expectedEvent)
      expect(onDropAccepted).not.toHaveBeenCalled()
      expect(onDropRejected).toHaveBeenCalledWith(files, expectedEvent)
    })

    it('applies the accept prop to the dropped images', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          accept="image/*"
        />
      )

      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith(images, [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })

    it('accepts a dropped image when Firefox provides a bogus file type', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          accept="image/*"
        />
      )
      const bogusImages = [
        {
          name: 'bogus.gif',
          size: 1234,
          type: 'application/x-moz-file'
        }
      ]

      await dropzone.simulate('drop', { dataTransfer: { files: bogusImages } })
      expect(onDrop).toHaveBeenCalledWith(bogusImages, [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(bogusImages, expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })

    it('accepts all dropped files and images when no accept prop is specified', async () => {
      const dropzone = mount(
        <Dropzone onDrop={onDrop} onDropAccepted={onDropAccepted} onDropRejected={onDropRejected} />
      )
      await dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      })
      expect(onDrop).toHaveBeenCalledWith(files.concat(images), [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(files.concat(images), expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })

    it('applies the maxSize prop to the dropped files', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          maxSize={1111}
        />
      )

      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDrop).toHaveBeenCalledWith(files, [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(files, expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })

    it('applies the maxSize prop to the dropped images', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          maxSize={1111}
        />
      )
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith([], images, expectedEvent)
      expect(onDropAccepted).not.toHaveBeenCalled()
      expect(onDropRejected).toHaveBeenCalledWith(images, expectedEvent)
    })

    it('applies the minSize prop to the dropped files', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          minSize={1112}
        />
      )
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(onDrop).toHaveBeenCalledWith([], files, expectedEvent)
      expect(onDropAccepted).not.toHaveBeenCalled()
      expect(onDropRejected).toHaveBeenCalledWith(files, expectedEvent)
    })

    it('applies the minSize prop to the dropped images', async () => {
      const dropzone = mount(
        <Dropzone
          onDrop={onDrop}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          minSize={1112}
        />
      )
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(onDrop).toHaveBeenCalledWith(images, [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })

    it('accepts all dropped files and images when no size prop is specified', async () => {
      const dropzone = mount(
        <Dropzone onDrop={onDrop} onDropAccepted={onDropAccepted} onDropRejected={onDropRejected} />
      )
      await dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      })
      expect(onDrop).toHaveBeenCalledWith(files.concat(images), [], expectedEvent)
      expect(onDropAccepted).toHaveBeenCalledWith(files.concat(images), expectedEvent)
      expect(onDropRejected).not.toHaveBeenCalled()
    })
  })

  describe('preview', () => {
    it('should generate previews for non-images', async () => {
      const dropSpy = spy()
      const dropzone = mount(<Dropzone onDrop={dropSpy} />)
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview')
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://file1.pdf')
    })

    it('should generate previews for images', async () => {
      const dropSpy = spy()
      const dropzone = mount(<Dropzone onDrop={dropSpy} />)
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview')
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://cats.gif')
    })

    it('should not throw error when preview cannot be created', async () => {
      const dropSpy = spy()
      const dropzone = mount(<Dropzone onDrop={dropSpy} />)

      await dropzone.simulate('drop', { dataTransfer: { files: ['bad_val'] } })

      expect(Object.keys(dropSpy.firstCall.args[1][0])).not.toContain('preview')
    })

    it('should not generate previews if disablePreview is true', async () => {
      const dropSpy = spy()
      const dropzone = mount(<Dropzone disablePreview onDrop={dropSpy} />)
      await dropzone.simulate('drop', { dataTransfer: { files: images } })
      await dropzone.simulate('drop', { dataTransfer: { files } })
      expect(dropSpy.callCount).toEqual(2)
      expect(Object.keys(dropSpy.firstCall.args[0][0])).not.toContain('preview')
      expect(Object.keys(dropSpy.lastCall.args[0][0])).not.toContain('preview')
    })
  })

  describe('onClick', () => {})

  describe('onCancel', () => {
    it('should not invoke onFileDialogCancel everytime window receives focus', done => {
      const onCancelSpy = spy()
      mount(<Dropzone id="on-cancel-example" onFileDialogCancel={onCancelSpy} />)
      // Simulated DOM event - onfocus
      document.body.addEventListener('focus', () => {})
      const evt = document.createEvent('HTMLEvents')
      evt.initEvent('focus', false, true)
      document.body.dispatchEvent(evt)
      // setTimeout to match the event callback from actual Component
      setTimeout(() => {
        expect(onCancelSpy.callCount).toEqual(0)
        done()
      }, 300)
    })

    it('should invoke onFileDialogCancel when window receives focus via cancel button', done => {
      const onCancelSpy = spy()
      const component = mount(
        <Dropzone className="dropzone-content" onFileDialogCancel={onCancelSpy} />
      )

      // Test / invoke the click event
      spy(component.instance(), 'open')
      component.simulate('click')

      setTimeout(() => {
        expect(component.instance().open.callCount).toEqual(1)

        // Simulated DOM event - onfocus
        window.addEventListener('focus', () => {})
        const evt = document.createEvent('HTMLEvents')
        evt.initEvent('focus', false, true)
        window.dispatchEvent(evt)

        // setTimeout to match the event callback from actual Component
        setTimeout(() => {
          expect(onCancelSpy.callCount).toEqual(1)
          done()
        }, 300)
      }, 0)
    })

    it('should restore isFileDialogActive to false after the FileDialog was closed', done => {
      const component = mount(<Dropzone />)

      spy(component.instance(), 'open')
      component.simulate('click')

      setTimeout(() => {
        expect(component.instance().isFileDialogActive).toEqual(true)

        const evt = document.createEvent('HTMLEvents')
        evt.initEvent('focus', false, true)
        window.dispatchEvent(evt)

        setTimeout(() => {
          expect(component.instance().isFileDialogActive).toEqual(false)
          done()
        }, 300)
      }, 0)
    })
  })

  describe('nested Dropzone component behavior', () => {
    const expectedEvent = expect.anything()
    const onOuterDrop = jest.fn()
    const onOuterDropAccepted = jest.fn()
    const onOuterDropRejected = jest.fn()

    const onInnerDrop = jest.fn()
    const onInnerDropAccepted = jest.fn()
    const onInnerDropRejected = jest.fn()

    const InnerDragAccepted = () => <p>Accepted</p>
    const InnerDragRejected = () => <p>Rejected</p>
    const InnerDropzone = () => (
      <Dropzone
        onDrop={onInnerDrop}
        onDropAccepted={onInnerDropAccepted}
        onDropRejected={onInnerDropRejected}
        accept="image/*"
      >
        {({ isDragActive, isDragReject }) => {
          if (isDragReject) return <InnerDragRejected />
          if (isDragActive) return <InnerDragAccepted />
          return <p>No drag</p>
        }}
      </Dropzone>
    )

    describe('dropping on the inner dropzone', () => {
      it('does dragEnter on both dropzones', async () => {
        const outerDropzone = mount(
          <Dropzone accept="image/*">{props => <InnerDropzone {...props} />}</Dropzone>
        )
        outerDropzone.find(InnerDropzone).simulate('dragEnter', {
          dataTransfer: { files: images }
        })
        const updatedOuterDropzone = await flushPromises(outerDropzone)
        const innerDropzone = updatedOuterDropzone.find(InnerDropzone)

        expect(innerDropzone).toHaveProp('isDragActive', true)
        expect(innerDropzone).toHaveProp('isDragReject', false)
        expect(innerDropzone.find(InnerDragAccepted)).toExist()
        expect(innerDropzone.find(InnerDragRejected)).not.toExist()
      })

      it('accepts the drop on the inner dropzone', async () => {
        const outerDropzone = mount(
          <Dropzone
            onDrop={onOuterDrop}
            onDropAccepted={onOuterDropAccepted}
            onDropRejected={onOuterDropRejected}
            accept="image/*"
          >
            {props => <InnerDropzone {...props} />}
          </Dropzone>
        )

        outerDropzone.find(InnerDropzone).simulate('drop', {
          dataTransfer: { files: files.concat(images) }
        })
        const updatedOuterDropzone = await flushPromises(outerDropzone)
        const innerDropzone = updatedOuterDropzone.find(InnerDropzone)

        expect(onInnerDrop).toHaveBeenCalledTimes(1)
        expect(onInnerDrop).toHaveBeenCalledWith(images, files, expectedEvent)
        expect(onInnerDropAccepted).toHaveBeenCalledTimes(1)
        expect(onInnerDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
        expect(onInnerDropRejected).toHaveBeenCalledTimes(1)
        expect(onInnerDropRejected).toHaveBeenCalledWith(files, expectedEvent)

        expect(innerDropzone.find(InnerDragAccepted)).not.toExist()
        expect(innerDropzone.find(InnerDragRejected)).not.toExist()
      })

      it('also accepts the drop on the outer dropzone', async () => {
        const outerDropzone = mount(
          <Dropzone
            onDrop={onOuterDrop}
            onDropAccepted={onOuterDropAccepted}
            onDropRejected={onOuterDropRejected}
            accept="image/*"
          >
            {props => <InnerDropzone {...props} />}
          </Dropzone>
        )

        outerDropzone.simulate('drop', {
          dataTransfer: { files: files.concat(images) }
        })
        const updatedOuterDropzone = await flushPromises(outerDropzone)

        const innerDropzone = updatedOuterDropzone.find(InnerDropzone)

        expect(onOuterDrop).toHaveBeenCalledTimes(1)
        expect(onOuterDrop).toHaveBeenCalledWith(images, files, expectedEvent)
        expect(onOuterDropAccepted).toHaveBeenCalledTimes(1)
        expect(onOuterDropAccepted).toHaveBeenCalledWith(images, expectedEvent)
        expect(onOuterDropRejected).toHaveBeenCalledTimes(1)
        expect(onOuterDropRejected).toHaveBeenCalledWith(files, expectedEvent)
        expect(innerDropzone).toHaveProp('isDragActive', false)
        expect(innerDropzone).toHaveProp('isDragReject', false)
      })
    })
  })

  describe('behavior', () => {
    it('does not throw an error when html is dropped instead of files and multiple is false', () => {
      const dropzone = mount(<Dropzone multiple={false} />)

      const fn = () => dropzone.simulate('drop', { dataTransfer: { files: [] } })
      expect(fn).not.toThrow()
    })

    it('does not allow actions when disabled props is true', done => {
      const dropzone = mount(<Dropzone disabled />)

      spy(dropzone.instance(), 'open')
      dropzone.simulate('click')
      setTimeout(() => {
        expect(dropzone.instance().open.callCount).toEqual(0)
        done()
      }, 0)
    })

    it('when toggle disabled props, Dropzone works as expected', done => {
      const dropzone = mount(<Dropzone disabled />)
      spy(dropzone.instance(), 'open')

      dropzone.setProps({ disabled: false })

      dropzone.simulate('click')
      setTimeout(() => {
        expect(dropzone.instance().open.callCount).toEqual(1)
        done()
      }, 0)
    })
  })
})
