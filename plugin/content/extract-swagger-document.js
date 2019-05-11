(function () {
    try {
        browser.runtime.onMessage.addListener(function (m) {
            if (m.operation === 'requestSchema') {
                let oasSchema;

                try {
                    oasSchema = generateSwaggerObject(window.wrappedJSObject.application);
                }
                catch (e) {
                    browser.runtime.sendMessage({operation: 'convertError', error: e.toString()}).then(function () {
                    }).catch(function(e) {
                        console.log(e);
                    });
                    return;
                }
                browser.runtime.sendMessage({operation: 'sendSchema', schema: JSON.stringify(oasSchema)}).then(function () {}).catch(function (e) {
                    console.log(`Error sending message: ${e}`);
                });
            }
        });
    }
    catch (e) {
        console.log(e);
    }
})();
