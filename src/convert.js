// Common schema definitions
const AIRTABLE_THUMBNAIL_SCHEMA = {
    required: [
        'url',
        'width',
        'height'
    ],
    properties: {
        url: {type: 'string'},
        width: {type: 'integer'},
        height: {type: 'integer'}
    }
};

const AIRTABLE_THUMBNAILS_SCHEMA = {
    required: [
        'large',
        'small'
    ],
    properties: {
        large: {'$ref': '#/components/schemas/AirtableThumbnail'},
        small: {'$ref': '#/components/schemas/AirtableThumbnail'}
    }
};

const AIRTABLE_ATTACHMENT_SCHEMA = {
    required: [
        'id',
        'size',
        'url',
        'type',
        'filename'
    ],
    properties: {
        id: {type: 'string'},
        size: {type: 'integer'},
        url: {type: 'string'},
        type: {type: 'string'},
        filename: {type: 'string'},
        thumbnails: {'$ref': '#/components/schemas/AirtableThumbnails'}
    }
};

const AIRTABLE_DELETED_RESPONSE = {
    required: [
        'id',
        'deleted'
    ],
    properties: {
        id: {type: 'string'},
        deleted: {type: 'boolean'}
    }
};

/**
 * Convert a column described in Airtable's schema definition format to a corresponding field definition in OAS 3.0 format
 * @param {object} column
 * @returns {{type: string, items: {type: string}}|{type: string, items: {$ref: string}}|{$ref: string}|{type: string}|{type}|{type, items}|*}
 */
function columnToType(column) {
    switch (column.type) {
        case 'currency':
            return {'type': 'number'};
        case 'percent':
            return {'type': 'number'};
        case 'number':
            switch (column?.typeOptions?.format) {
                case 'integer':
                case 'duration':
                    return {'type': 'integer'};
                case 'decimal':
                case 'currency':
                case 'percent':
                case undefined:
                    return {'type': 'number'};
                default:
                    if (column.typeOptions && !column.typeOptions?.format) {
                        return {'type': column.typeOptions.result.type };
                    }

                    throw new Error(`Unable to infer the type of column ${column.name}: unknown numerical format ${column.typeOptions.format}`);
            }
        case 'multipleLookupValues':
        case 'multipleRecordLinks':
            return {'type': 'array', 'items': {'type': 'string'}}
        case 'foreignKey':
            switch (column.typeOptions.relationship) {
                case 'one':
                case 'many':
                    return {'type': 'array', 'items': {'type': 'string'}};
                default:
                    throw new Error(`Unknown relationship type ${column.typeOptions.relationship} in column ${column.name}`);
            }
        case 'count':
        case 'autoNumber':
            return {'type': 'integer'};
        case 'multilineText':
        case 'text':
        case 'richText':
        case 'date':
        case 'dateTime':
        case 'phone':
        case 'enum':
        case 'select':
        case 'singleSelect':
        case 'singleLineText':
        case 'createdTime':
        case 'lastModifiedTime':
        case 'url':
            // TODO: Properly use enum
            return {'type': 'string'};
        case 'multipleAttachments':
        case 'multiSelect':
            return {'type': 'array', 'items': {'type': 'string'}};
        case 'checkbox':
            return {'type': 'boolean'};
        case 'multipleAttachment':
            return {'type': 'array', 'items': {'$ref': '#/components/schemas/AirtableAttachment'}};
        case 'attachment':
            return {'$ref': '#/components/schemas/AirtableAttachment'};
        case 'lookup':
            let type = {'type': 'array'};
            switch (column.typeOptions.resultType) {
                case 'foreignKey':
                    type.items = {'type': 'string'};
                    break;
                case 'multipleAttachment':
                case 'attachment':
                case 'formula':
                case 'rollup':
                    throw new Error(`Column ${column.name} is unsupported. Lookup type columns cannot have result type ${column.typeOptions.resultType}`);
                default:
                    const items = columnToType({
                        type: column.typeOptions.resultType,
                        typeOptions: column.typeOptions,
                        name: column.name
                    }).type;
                    if (items) {
                        type.items = {type: items};
                    } else {
                        throw new Error(`Column ${column.name} is unsupported. Lookup type columns cannot have result type ${column.typeOptions.resultType}`);
                    }
            }
            return type;
        case 'formula':
        case 'rollup':
            if (column.options.result.type === 'formula' || column.options.result.type === 'rollup') {
                throw new Error(`Column ${column.name} is invalid. Rollup and Formula type columns cannot have formula or rollup resultType`);
            }
            return columnToType({
                type: column.options.result.type,
                typeOptions: column.options,
                name: column.name
            });
        default:
            throw new Error(`Unable to infer the type of column ${column.name}: unknown type ${column.type}`);
    }
}

/**
 * Returns true if the column will be used in read operations only
 * @param column
 * @returns {boolean}
 */
function columnIsReadOnly(column) {
    switch (column.type) {
        case 'rollup':
        case 'lookup':
        case 'formula':
        case 'count':
        case 'autoNumber':
        case 'attachment':
        case 'multipleAttachment':
            // TODO: Support creating attachments
            return true;
        default:
            return false
    }
}

/**
 * Convert an Airtable schema description object into an OAS object describing the Airtable Base API
 * @param schema
 * @returns {{components: {schemas: {AirtableDeleted: {required: string[], properties: {deleted: {type: string}, id: {type: string}}}, AirtableThumbnails: {required: string[], properties: {small: {$ref: string}, large: {$ref: string}}}, AirtableAttachment: {required: string[], properties: {filename: {type: string}, size: {type: string}, id: {type: string}, type: {type: string}, thumbnails: {$ref: string}, url: {type: string}}}, AirtableThumbnail: {required: string[], properties: {width: {type: string}, url: {type: string}, height: {type: string}}}}, securitySchemes: {BearerAuth: {scheme: string, type: string}}}, servers: {url: string}[], openapi: string, paths, info: {title: string, version: string}}}
 */
function generateSwaggerObject(schema) {

    let swaggerSchemas = {
        AirtableThumbnail: AIRTABLE_THUMBNAIL_SCHEMA,
        AirtableThumbnails: AIRTABLE_THUMBNAILS_SCHEMA,
        AirtableAttachment: AIRTABLE_ATTACHMENT_SCHEMA,
        AirtableDeleted: AIRTABLE_DELETED_RESPONSE
    };
    let swaggerPaths = {};

    for (let i = 0; i < schema.tables.length; i++) {
        let table = schema.tables[i];
        let allFieldsSchema = {properties: {}};
        let editableFieldsSchema = {properties: {}};
        for (let j = 0; j < table.fields.length; j++) {
            let column = table.fields[j];
            const swaggerType = columnToType(column);
            allFieldsSchema.properties[column.name] = swaggerType;
            if (!columnIsReadOnly(column)) {
                editableFieldsSchema.properties[column.name] = swaggerType;
            }
        }

        const urlSafeName = table.name.replace(/[;/?:@=&" <>#%{}|\\^~[\]`]+/g, '');

        swaggerSchemas[`Read${urlSafeName}Fields`] = allFieldsSchema;
        swaggerSchemas[`Write${urlSafeName}Fields`] = editableFieldsSchema;
        swaggerSchemas[`Read${urlSafeName}`] = {
            properties: {
                id: {type: 'string'},
                createdTime: {type: 'string'},
                fields: {'$ref': `#/components/schemas/Read${urlSafeName}Fields`}
            }
        };
        swaggerSchemas[`Read${urlSafeName}RequestBody`] = {
            properties: {
                fields: {'$ref': `#/components/schemas/Read${urlSafeName}Fields`}
            }
        };
        swaggerSchemas[`Write${urlSafeName}RequestBody`] = {
            properties: {
                fields: {'$ref': `#/components/schemas/Write${urlSafeName}Fields`}
            }
        };


        // List, Create
        swaggerPaths[`/${table.name}`] = {
            'get': {
                operationId: `list${urlSafeName}`,
                security: [
                    {
                        BearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: 'fields',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    },
                    {
                        name: 'filterByFormula',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string'
                        }
                    },
                    {
                        name: 'maxRecords',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'integer'
                        }
                    },
                    {
                        name: 'pageSize',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'integer'
                        }
                    },
                    {
                        name: 'offset',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string'
                        }
                    },
                    // TODO
                    // {
                    //    name: 'sort'
                    //    etc...
                    // },
                    {
                        name: 'view',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string'
                        }
                    },
                    {
                        name: 'cellFormat',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string'
                        }
                    },
                    {
                        name: 'userLocale',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'List Objects Response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        '$ref': `#/components/schemas/Read${urlSafeName}`
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'post': {
                operationId: `create${urlSafeName}`,
                security: [
                    {
                        BearerAuth: []
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                '$ref': `#/components/schemas/Write${urlSafeName}RequestBody`
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Create Object Response',
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/Read${urlSafeName}`
                                }
                            }
                        }
                    }
                }
            }
        };

        // Retrieve, Update, Delete
        swaggerPaths[`/${table.name}/{id}`] = {
            'get': {
                operationId: `retrieve${urlSafeName}`,
                security: [
                    {
                        BearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Create Object Response',
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/Read${urlSafeName}`
                                }
                            }
                        }
                    }
                }
            },
            'patch': {
                operationId: `update${urlSafeName}`,
                security: [
                    {
                        BearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string'
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                '$ref': `#/components/schemas/Read${urlSafeName}RequestBody`
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Update Object Response',
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/Read${urlSafeName}`
                                }
                            }
                        }
                    }
                }
            },
            'delete': {
                operationId: `delete${urlSafeName}`,
                security: [
                    {
                        BearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Delete Object Response',
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': '#/components/schemas/AirtableDeleted'
                                }
                            }
                        }
                    }
                }
            },
        }
    }

    return {
        openapi: '3.0.0',
        info: {
            version: '1.0.0',
            title: `Airtable API for ${schema.name}`,
        },
        servers: [
            {
                url: `https://api.airtable.com/v0/${schema.id}`
            }
        ],
        components: {
            schemas: swaggerSchemas,
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer'
                }
            }
        },
        paths: swaggerPaths
    }
}

// Get this to work as both as a module and as a content_script for a plugin
try {
    module.exports = {generateSwaggerObject};
} catch (e) {
}

