import sax from 'sax'

interface XMLElement {
  type: string
  props: any
  children: Array<XMLElement | string>
}

async function parseXMLString(xml: string): Promise<XMLElement> {
  const parser = sax.parser(true, {trim: true})

  const result: XMLElement = { type: 'root', props: {}, children: [] }

  const elemStack = [result]

  const topElem = () => elemStack[elemStack.length - 1]

  parser.ontext = (text) => {
    topElem().children.push(text)
  }
  parser.onopentag = (node) => {
    const newNode = {
      type: node.name,
      props: node.attributes,
      children: [],
    }
    topElem().children.push(newNode)
    elemStack.push(newNode)
  }
  parser.onclosetag = () => {
    elemStack.pop()
  }
  await new Promise((resolve, reject) => {
    parser.onend = resolve
    parser.onerror = reject
    parser.write(xml).close()
  })

  return result.children[0] as any
}

function convertToJson(elem: XMLElement) {
  if (elem.children.length === 1 && typeof elem.children[0] === 'string') {
    return elem.children[0]
  }
  const obj: any = {}
  Object.keys(elem.props).forEach((k) => {
    obj[k] = elem.props[k]
  })
  for (const child of elem.children) {
    if (typeof child === 'string') {
      throw new Error('string in unexpected position')
    }
    if (child.type in obj) {
      if (!Array.isArray(obj[child.type])) {
        obj[child.type] = [obj[child.type]]
      }
      obj[child.type].push(convertToJson(child))
    } else {
      obj[child.type] = convertToJson(child)
    }
  }

  return obj
}

export async function parseXML(xmlString: string) {
  return convertToJson(await parseXMLString(xmlString))
}
