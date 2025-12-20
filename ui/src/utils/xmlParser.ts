import { toast } from 'sonner';
import type { CatalogObservation, MetadataExtractionRule } from '../types';

/**
 * Parses XML string and throws if invalid.
 * DOMParser doesn't throw - it returns a doc with <parsererror> element.
 */
const parseXml = (xmlString: string): Document => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Check for parse errors - DOMParser embeds errors in the document
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML');
  }

  return xmlDoc;
};

export const parseXmlToObservations = (xmlString: string, metadata: Record<string, string>): CatalogObservation[] => {
  const xmlDoc = parseXml(xmlString);
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
          if (!attr) continue;
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

export const extractMetadataFromXml = (xmlString: string, rules: Record<string, MetadataExtractionRule>): Record<string, string> => {
  const xmlDoc = parseXml(xmlString);
  const extracted: Record<string, string> = {};

  if (!rules) return extracted;

  Object.entries(rules).forEach(([field, rule]) => {
    if (!rule.xpaths) return;
    
    for (const xpath of rule.xpaths) {
      try {
        // Evaluate XPath - resultType 2 is STRING_TYPE
        const result = xmlDoc.evaluate(
          xpath,
          xmlDoc,
          null,
          2, // XPathResult.STRING_TYPE
          null
        );
        const value = result.stringValue?.trim();

        if (value) {
          // Validate regex if present
          if (rule.validationRegex) {
            try {
                const regex = new RegExp(rule.validationRegex);
                if (regex.test(value)) {
                  extracted[field] = value;
                  break; // Found a valid match
                }
            } catch {
                toast.warning(`Invalid regex for "${field}": ${rule.validationRegex}`);
            }
          } else {
            extracted[field] = value;
            break; // Found a match
          }
        }
      } catch (e) {
        // Ignore invalid XPaths
      }
    }
  });

  return extracted;
};
