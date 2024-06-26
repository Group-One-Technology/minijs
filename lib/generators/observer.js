import { Mini } from '@/main'
import { Entity } from '@/entity'
import { Events } from '@/entity/events'

const MutationObserver =
  window.MutationObserver || window.WebKitMutationObserver

function observeDOM(obj, callback) {
  if (obj == null || obj.nodeType !== 1) return

  if (MutationObserver) {
    // define a new observer
    const mutationObserver = new MutationObserver(callback)

    // have the observer observe for changes in children
    mutationObserver.observe(obj, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return mutationObserver
    // browser support fallback
  } else if (window.addEventListener) {
    obj.addEventListener('DOMNodeInserted', callback, false)
    obj.addEventListener('DOMNodeRemoved', callback, false)

    return () => {
      obj.removeEventListener('DOMNodeInserted', callback, false)
      obj.removeEventListener('DOMNodeRemoved', callback, false)
    }
  }
}

export class Observer {
  static SCRIPT_ID = 'mini.scriptId'

  constructor(state) {
    this.base = new Mini()
    this.observer = null
    this.dynamicScripts = new Map()
  }

  init() {
    this.observe(document.body, (mutation) => {
      mutation.forEach((record) => {
        if (
          record.type === 'attributes' &&
          record.attributeName.startsWith(':')
        ) {
          const entity = this.base.state.getEntityByElement(record.target)
          if (!entity) return

          const attr = record.attributeName
          const isDeleted = entity.element.getAttribute(attr) === null

          if (Events.isValidEvent(attr)) {
            if (isDeleted) entity.events.disposeEvent(attr)
            else {
              entity.data.initAttributeVariables()
              entity.events.applyEvent(attr)
            }
          } else {
            if (isDeleted) entity.attributes.disposeAttribute(attr)
            else {
              entity.data.initAttributeVariables()
              entity.attributes.evaluateAttribute(attr)
            }
          }
        }

        record.removedNodes.forEach((node) => {
          if (node.nodeType !== 1) return
          const entity = this.base.state.getEntityByElement(node)
          entity?.dispose()
        })

        const dynamicScripts = this.createScriptPromises(
          Array.from(record.addedNodes)
        )

        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return

          const entity = new Entity(node, dynamicScripts)
          entity.init().then(() => {
            entity.initChildren()
          })
        })
      })
    })
  }

  observe(obj, callback) {
    this.observer = observeDOM(obj, callback)
  }

  createScriptPromises(nodes) {
    const dynamicScripts = nodes
      .reduce((acc, node) => {
        if (node.nodeType !== 1) return acc
        return [...acc, ...node.querySelectorAll('script')]
      }, [])
      .filter((node) => node.tagName === 'SCRIPT')

    return dynamicScripts.map((script) => {
      let resolve, reject
      const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      promise.resolve = resolve
      promise.reject = reject

      script.dataset[Observer.SCRIPT_ID] =
        script.dataset[Observer.SCRIPT_ID] ?? this.generateUUID()

      script.textContent += `\nMiniJS.resolveScript()`
      if (!this.dynamicScripts.get(script.dataset[Observer.SCRIPT_ID]))
        this.dynamicScripts.set(script.dataset[Observer.SCRIPT_ID], promise)

      return script
    })
  }

  async waitForScripts(scripts) {
    const promises = scripts.map((script) =>
      this.dynamicScripts.get(script.dataset[Observer.SCRIPT_ID])
    )
    await Promise.all(promises.map((promise) => promise.catch((e) => e)))
  }

  resolveScript() {
    const script = document.currentScript
    const scriptID = script.dataset['mini.scriptId']
    const promise = this.dynamicScripts.get(scriptID)
    if (!promise) return

    promise.resolve()

    delete script.dataset['mini.scriptId']
    script.textContent = script.textContent.replace(
      '\nMiniJS.resolveScript()',
      ''
    )
  }

  generateUUID() {
    return 'ScriptID' + Math.floor(performance.now() * 1000).toString(36) + Math.random().toString(36).substr(2, 9);
  }

  cryptoRandomString() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  disconnect() {
    if (this.observer == null) return
    this.observer.disconnect()
  }
}
