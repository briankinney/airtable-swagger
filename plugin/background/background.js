console.log('background running');


(function () {
    let schemaObject = {};
    browser.runtime.onMessage.addListener(function (m) {
        schemaObject = m;
    });

    browser.pageAction.onClicked.addListener(function () {
        if (schemaObject) {
            console.log(JSON.stringify(schemaObject));
            navigator.clipboard.writeText(schemaObject.schema).then(function () {}).catch(function (e) {
                console.log(e);
            });
        }
    });
})();
