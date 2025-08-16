/**
 * ESLint Rule: no-large-seo-documents
 * 
 * Prevents reintroduction of large SEO document patterns after Wave 4 migration.
 * 
 * This rule detects code patterns that might create large SEO documents:
 * - Direct writes to legacy collections with large payloads
 * - Missing aggregate-first patterns
 * - Bypassing the compact storage requirements
 */

export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent reintroduction of large SEO documents after migration',
      recommended: true,
    },
    messages: {
      largeSeoDocument: 'Large SEO document detected: {{message}}. Use aggregate collections and compact storage patterns instead.',
      legacyCollection: 'Direct write to legacy collection {{collection}} detected. Use aggregate collections ({{suggested}}) for new data.',
      largePayload: 'Large payload detected in Firestore write. Consider using aggregate patterns to stay under size limits.',
      missingAggregatePattern: 'SEO document creation should use aggregate-first patterns with compact storage.',
    },
    schema: [{
      type: 'object',
      properties: {
        maxPayloadSize: {
          type: 'number',
          default: 2500
        },
        legacyCollections: {
          type: 'array',
          items: { type: 'string' },
          default: [
            'neuralCrawlerResults',
            'semanticMapResults', 
            'neuroseo-analyses',
            'neuroSeoAnalysis'
          ]
        },
        aggregateCollections: {
          type: 'object',
          default: {
            'neuralCrawlerResults': 'neuralCrawlerResultsAgg',
            'semanticMapResults': 'semanticMapResultsAgg',
            'neuroseo-analyses': 'neuroSeoAnalyses',
            'neuroSeoAnalysis': 'neuroSeoAnalyses'
          }
        }
      }
    }]
  },

  create(context) {
    const options = context.options[0] || {};
    const maxPayloadSize = options.maxPayloadSize || 2500;
    const legacyCollections = options.legacyCollections || [
      'neuralCrawlerResults',
      'semanticMapResults',
      'neuroseo-analyses', 
      'neuroSeoAnalysis'
    ];
    const aggregateCollections = options.aggregateCollections || {
      'neuralCrawlerResults': 'neuralCrawlerResultsAgg',
      'semanticMapResults': 'semanticMapResultsAgg',
      'neuroseo-analyses': 'neuroSeoAnalyses',
      'neuroSeoAnalysis': 'neuroSeoAnalyses'
    };

    function checkFirestoreWrite(node, collectionName, payloadNode) {
      // Check for writes to legacy collections
      if (legacyCollections.includes(collectionName)) {
        const suggested = aggregateCollections[collectionName];
        context.report({
          node,
          messageId: 'legacyCollection',
          data: { 
            collection: collectionName,
            suggested: suggested || 'an appropriate aggregate collection'
          }
        });
        return;
      }

      // Check for large payloads
      if (payloadNode && payloadNode.type === 'ObjectExpression') {
        const propertyCount = payloadNode.properties.length;
        
        // Heuristic: objects with many properties or specific large-data patterns
        if (propertyCount > 20) {
          context.report({
            node: payloadNode,
            messageId: 'largePayload',
            data: { message: `Object with ${propertyCount} properties may exceed size limits` }
          });
        }

        // Check for specific problematic patterns
        const problematicProperties = [
          'content', 'fullContent', 'rawHtml', 'pageContent',
          'images', 'links', 'entities', 'issues', 'headings'
        ];

        for (const prop of payloadNode.properties) {
          if (prop.type === 'Property' && 
              prop.key.type === 'Identifier' &&
              problematicProperties.includes(prop.key.name)) {
            
            // If it's an array assignment, flag it
            if (prop.value.type === 'ArrayExpression') {
              context.report({
                node: prop,
                messageId: 'largeSeoDocument',
                data: { message: `Large array field '${prop.key.name}' should be aggregated or omitted` }
              });
            }
          }
        }
      }
    }

    function getStringLiteralValue(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      }
      if (node.type === 'TemplateElement') {
        return node.value.cooked;
      }
      return null;
    }

    function checkCollectionReference(node) {
      let collectionName = null;
      
      // Handle .collection('name') calls
      if (node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'collection' &&
          node.arguments.length > 0) {
        
        collectionName = getStringLiteralValue(node.arguments[0]);
      }

      return collectionName;
    }

    return {
      // Check Firestore collection().add() calls
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression') {
          const method = node.callee.property.name;
          
          if (['add', 'set', 'update'].includes(method)) {
            // Walk up to find the collection call
            let current = node.callee.object;
            let collectionName = null;
            
            while (current) {
              if (current.type === 'CallExpression') {
                const foundCollection = checkCollectionReference(current);
                if (foundCollection) {
                  collectionName = foundCollection;
                  break;
                }
              }
              
              if (current.type === 'MemberExpression') {
                current = current.object;
              } else {
                break;
              }
            }

            if (collectionName && node.arguments.length > 0) {
              const payloadNode = node.arguments[0];
              checkFirestoreWrite(node, collectionName, payloadNode);
            }
          }
        }
      },

      // Check for string literals that might be collection names in variable assignments
      VariableDeclarator(node) {
        if (node.id.name && node.id.name.toLowerCase().includes('collection') && 
            node.init && node.init.type === 'Literal' && 
            typeof node.init.value === 'string') {
          
          const collectionName = node.init.value;
          if (legacyCollections.includes(collectionName)) {
            const suggested = aggregateCollections[collectionName];
            context.report({
              node: node.init,
              messageId: 'legacyCollection',
              data: { 
                collection: collectionName,
                suggested: suggested || 'an appropriate aggregate collection'
              }
            });
          }
        }
      }
    };
  }
};