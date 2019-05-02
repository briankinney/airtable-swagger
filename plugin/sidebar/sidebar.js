(function () {
    console.log('registering sidebar listener');
    browser.runtime.onMessage.addListener(function (m) {
        if (m.operation === 'setSidebarContent') {
            let definitionElement = document.getElementById('definition');
            definitionElement.value = m.content;
        }
    });
    console.log('sidebar listener registered');

    let extractButton = document.getElementById('extractSchemaButton');
    extractButton.addEventListener('click', function () {
        browser.runtime.sendMessage({operation: 'extractSchema'}).then(function () {
        }).catch(function (e) {
            console.log(e);
        });
    });
})();