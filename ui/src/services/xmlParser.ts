import type { CatalogObservation } from '../types';

export const parseXmlToObservations = (xmlString: string, metadata: Record<string, string>): CatalogObservation[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const observations: Map<string, CatalogObservation> = new Map();

  const traverse = (node: Node, path: string = "") => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const localName = element.localName;
      const currentPath = `${path}/${localName}`;

      // Handle attributes
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          if (attr.prefix === 'xmlns' || attr.name === 'xmlns' || attr.name.includes(':')) {
             if (attr.name !== 'xsi:nil') continue; // Only keep xsi:nil
          }
          
          if (attr.name !== 'xsi:nil') {
              const attrPath = `${currentPath}/@${attr.name}`;
              updateObservation(attrPath, false, false);
          }
        }
      }

      // Check for leaf element
      const hasChildElements = Array.from(element.childNodes).some(child => child.nodeType === Node.ELEMENT_NODE);
      
      if (!hasChildElements) {
        const isNil = element.getAttribute("xsi:nil") === "true";
        const textContent = element.textContent || "";
        const isEmpty = !isNil && textContent.trim().length === 0;
        
        updateObservation(currentPath, isNil, isEmpty);
      } else {
        // Continue traversal
        element.childNodes.forEach(child => traverse(child, currentPath));
      }
    }
  };

  const updateObservation = (fieldPath: string, isNil: boolean, isEmpty: boolean) => {
    const existing = observations.get(fieldPath);
    if (existing) {
      existing.count += 1;
      existing.hasNull = existing.hasNull || isNil;
      existing.hasEmpty = existing.hasEmpty || isEmpty;
    } else {
      observations.set(fieldPath, {
        fieldPath,
        metadata: { ...metadata },
        count: 1,
        hasNull: isNil,
        hasEmpty: isEmpty
      });
    }
  };

  if (xmlDoc.documentElement) {
    traverse(xmlDoc.documentElement);
  }

  return Array.from(observations.values());
};
