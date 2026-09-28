const textWrites = new WeakMap<Node, string>();
const attributeWrites = new WeakMap<Element, Map<string, string | null>>();

export function writeText(node: Text, value: string): void {
  textWrites.set(node, value);
  node.data = value;
}

export function writeAttribute(node: Element, name: string, value: string | null): void {
  let attributes = attributeWrites.get(node);
  if (!attributes) {
    attributes = new Map();
    attributeWrites.set(node, attributes);
  }
  attributes.set(name, value);
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

export function isInternalMutation(record: MutationRecord): boolean {
  if (record.type === 'characterData')
    return textWrites.get(record.target) === record.target.textContent;
  if (record.type === 'attributes' && record.attributeName) {
    const element = record.target as Element;
    const attributes = attributeWrites.get(element);
    return (
      !!attributes?.has(record.attributeName) &&
      attributes.get(record.attributeName) === element.getAttribute(record.attributeName)
    );
  }
  return false;
}
