(function () {
    //add a callback frunction once received a message
    browser.runtime.onMessage.addListener(function (m) {
        //todo: why need a setSidebar content here?
        if (m.operation === 'sendSchema') {
            browser.runtime.sendMessage({operation: 'setSidebarContent', content: m.schema}).then(function () {
            }).catch(function (e) {
                console.log(e);
            });
        }
        else if (m.operation === 'extractSchema') {
            browser.tabs.query({active: true}).then(function (tabInfo) {
                // use tabs.sendMessage here because runtime.sendMessage cannot send to content scripts
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
