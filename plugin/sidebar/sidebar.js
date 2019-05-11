(function () {
    browser.runtime.onMessage.addListener(function (m) {
        if (m.operation === 'setSidebarContent') {
            let definitionElement = document.getElementById('definition');
            definitionElement.value = m.content;
        }
    });

    let extractOASButton = document.getElementById('extractOASButton');
    extractOASButton.addEventListener('click', function () {
        browser.runtime.sendMessage({operation: 'extractSchema', format: 'oas3'}).then(function () {
        }).catch(function (e) {
            console.log(e);
        });
    });

    let extractAirtableButton = document.getElementById('extractAirtableButton');
    extractAirtableButton.addEventListener('click', function () {
        browser.runtime.sendMessage({operation: 'extractSchema', format: 'airtable'}).then(function() {
        }).catch(function (e) {
            console.log(e);
        })
    })
})();