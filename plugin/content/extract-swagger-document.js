(function () {
    try {
        function removeForeignTables(obj) {
            console.log(typeof obj);
            switch (typeof obj) {
                case 'object':
                    let result = {};
                    for (let key in obj) {
                        // todo: what is a foreign table?
                        if (obj.hasOwnProperty(key) && key !== 'foreignTable') {
                            result[key] = removeForeignTables(obj[key]);
                        }
                    }
                    if (Array.isArray(obj)) {
                        {
                            let arrayResult = [];
                            for (let i = 0; i < obj.length; i++) {
                                arrayResult.push(result[String(i)]);
                            }
                            result = arrayResult;
                        }
                    }
                    return result;
                default:
                    return obj;
            }
        }

        browser.runtime.onMessage.addListener(function (m) {
            if (m.operation === 'requestSchema') {
                // how to know which property to access
                let schema = window.wrappedJSObject.application;

                if (m.format === 'oas3') {
                    try {
                        schema = generateSwaggerObject(schema);
                    } catch (e) {
                        browser.runtime.sendMessage({operation: 'convertError', error: e.toString()}).then(function () {
                        }).catch(function (e) {
                            console.log(e);
                        });
                        return;
                    }
                    browser.runtime.sendMessage({
                        operation: 'sendSchema',
                        schema: JSON.stringify(schema)
                    }).then(function () {
                    }).catch(function (e) {
                        console.log(`Error sending message: ${e}`);
                    });
                } else if (m.format === 'airtable') {
                    schema = removeForeignTables(schema);
                    browser.runtime.sendMessage({
                        operation: 'sendSchema',
                        schema: JSON.stringify(schema)
                    }).then(function () {
                    }).catch(function (e) {
                        console.log(`Error sending message: ${e}`);
                    });
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
})();
