console.log('background running');


(function () {
    let schemaObject = {};
    browser.runtime.onMessage.addListener(function (m) {
        console.log(`Got message: ${m}`);
        schemaObject = m;
    });

    browser.pageAction.onClicked.addListener(function () {
        console.log('hello world');
        if (schemaObject) {
            console.log(JSON.stringify(schemaObject));
            navigator.clipboard.writeText(schemaObject.schema).then(function () {
                console.log('copied');
            }).catch(function (e) {
                console.log(e);
            });
        }
    });
})();
