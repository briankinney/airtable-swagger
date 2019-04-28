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

function columnToType(column) {
    switch (column.type) {
        case 'number':
            switch (column.typeOptions.format) {
                case 'integer':
                    return {'type': 'integer'};
                case 'decimal':
                    return {'type': 'number'};
                case 'currency':
                    return {'type': 'number'};
                case undefined:
                    return {'type': 'number'};
                default:
                    throw new Error(`Unable to infer the type of column ${column.name}: unknown numerical format ${column.typeOptions.format}`);
            }
        case 'count':
            return {'type': 'integer'};
        case 'multilineText':
        case 'text':
        case 'date':
        case 'foreignKey':
        case 'enum':
        case 'select':
            // TODO: Properly use enum
            return {'type': 'string'};
        case 'checkbox':
            return {'type': 'boolean'};
        case 'multipleAttachment':
            return {'type': 'array', 'items': {'$ref': '#/components/schemas/AirtableAttachment'}};
        case 'attachment':
            return {'$ref': '#/components/schemas/AirtableAttachment'};
        case 'formula':
        case 'rollup':
            if (column.resultType === 'formula' || column.resultType === 'rollup') {
                throw new Error(`Column ${column.name} is invalid. Rollup and Formula type columns cannot have formula or rollup resultType`);
            }
            return columnToType({
                type: column.typeOptions.resultType,
                typeOptions: column.typeOptions,
                name: column.name
            });
        default:
            throw new Error(`Unable to infer the type of column ${column.name}: unknown type ${column.type}`);
    }
}

function columnIsReadOnly(column) {
    switch (column.type) {
        case 'rollup':
        case 'formula':
        case 'count':
        case 'attachment':
        case 'multipleAttachment':
            return true;
        default:
            return false
    }
}

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
        for (let j = 0; j < table.columns.length; j++) {
            let column = table.columns[j];
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
            'put': {
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

module.exports = {generateSwaggerObject};
