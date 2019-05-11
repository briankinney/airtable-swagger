(function () {
    browser.runtime.onMessage.addListener(function (m) {
        if (m.operation === 'sendSchema') {
            browser.runtime.sendMessage({operation: 'setSidebarContent', content: m.schema}).then(function () {
            }).catch(function (e) {
                console.log(e);
            });
        }
        else if (m.operation === 'extractSchema') {
            browser.tabs.query({active: true}).then(function (tabInfo) {
                browser.tabs.sendMessage(tabInfo[0].id, {operation: 'requestSchema', format: m.format});
            }).catch(function (e) {
                console.log(e);
            });
        }
        else if (m.operation === 'convertError') {
            const message = `There was an error converting your Airtable schema into an OAS definiton:\n\n${m.error}`;
            browser.runtime.sendMessage({operation: 'setSidebarContent', content: message}).then(function () {
            }).catch(function (e) {
                console.log(e);
            });
        }
    });

    browser.pageAction.onClicked.addListener(function () {
        browser.sidebarAction.open().then(function() {
        }).catch(function (e) {
            console.log(e);
        });
    });
})();
