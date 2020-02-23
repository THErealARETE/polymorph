//todo: putter mode for inspector
polymorph_core.registerOperator("inspectolist", {
    displayName: "Inspectolist",
    description: "Combination between inspector and list. Gives detailed information about specific items."
}, function (container) {
    let defaultSettings = {
        dumpProp: "description",
        currentItem: guid(4),
        filter: guid(4),
        tagColors: {}
    };
    polymorph_core.operatorTemplate.call(this, container, defaultSettings);
    this.rootdiv.style.color = "white";
    this.rootdiv.appendChild(htmlwrap(`
    <style>
        h3{
            margin:0;
        }
        h2{
            margin:0;
        }
        [data-role="topbar"]{
            padding: 3px;
            margin: 1px;
            background: black;
            border-radius: 3px;
        }
    </style>
    `));
    this.rootdiv.style.overflow="auto";
    this.rootdiv.style.height="100%";
    // Add the search/entry box
    let searchEntryBox = document.createElement("div");
    searchEntryBox.contentEditable = true;
    this.rootdiv.appendChild(searchEntryBox);

    this.matchbox = htmlwrap(`
    <div>
        <h2>Matched items</h2>
        <div>
    </div>
    `);
    this.rootdiv.appendChild(this.matchbox);
    this.matchbox = this.matchbox.querySelector("div");

    this.unmatchbox = htmlwrap(`
    <div>
        <h2>Unmatched items</h2>
        <div>
    </div>
    `);
    this.rootdiv.appendChild(this.unmatchbox);
    this.unmatchbox = this.unmatchbox.querySelector("div");

    this.currentFilters = {};
    let similarish = (setA, setB) => {
        let indexA = indexB = 0;
        let simscore = 0;
        while (indexA < setA.length && indexB < setB.length) {
            if (setA[indexA][0] > setB[indexB][0]) {
                indexB++;
            } else if (setA[indexA][0] < setB[indexB][0]) {
                indexA++;
            } else {
                //they are the same
                return true;
            }
        }
        return false;
    }
    let generateFilter = (currentText) => {
        let currentFilter = {};
        let re = /[#\w]+/g;
        let wrd = undefined;
        while (wrd = re.exec(currentText)) {
            let cwd = wrd[0].toLowerCase();
            currentFilter[cwd] = currentFilter[cwd] | 0;
            currentFilter[cwd]++;
        }
        currentFilter = Object.entries(currentFilter);
        currentFilter = currentFilter.sort((a, b) => a[0] > b[0] ? 1 : -1);
        return currentFilter;
    }

    searchEntryBox.addEventListener("keydown", (e) => {
        if (e.key == "Enter" && e.getModifierState("Shift") == false) {
            //create a new item
            let it = {};
            it[this.settings.dumpProp] = e.target.innerText;
            it[this.settings.filter] = true;
            let id = polymorph_core.insertItem(it);
            container.fire("createItem", { id: id, sender: this });
            renderTopbar(id);
            renderRichText(id);
            this.currentFilters[id] = generateFilter(polymorph_core.items[id][this.settings.dumpProp]);
            e.target.innerHTML = "";
            expand(id);
            this.rootdiv.querySelector(`[data-item="${id}"] [data-role="richtext"]`).focus();
            e.preventDefault();
        } else {

        }
    })
    searchEntryBox.addEventListener("input", (e) => {
        //perform searchfilter
        currentFilter = generateFilter(e.target.innerText);
        for (let i in this.currentFilters) {
            if (similarish(this.currentFilters[i], currentFilter)) {
                this.matchbox.appendChild(this.rootdiv.querySelector(`[data-item="${i}"]`));
            } else {
                this.unmatchbox.appendChild(this.rootdiv.querySelector(`[data-item="${i}"]`));
            }
        }
    })

    let getContainer = (id) => {
        let thisItemContainer = this.rootdiv.querySelector(`[data-item="${id}"]`);
        if (!thisItemContainer) {
            thisItemContainer = document.createElement('div');
            thisItemContainer.dataset.item = id;
            this.matchbox.appendChild(thisItemContainer);
        }
        return thisItemContainer;
    }

    let renderTopbar = (id) => {
        let itemContainer = getContainer(id);
        let topbar = itemContainer.querySelector(`[data-role='topbar']`);
        if (!topbar) {
            topbar = htmlwrap(`<h3 data-role="topbar"></h3>`);
            itemContainer.insertBefore(topbar, itemContainer.children[0]);
        }
        if (polymorph_core.items[id][this.settings.dumpProp]) {
            let innerText = polymorph_core.items[id][this.settings.dumpProp];
            let toptext = innerText.split("\n")[0];
            let tagfilter = /#(\w+)(:[\w\d]+)?/g;
            let seenTags = {};
            while (result = tagfilter.exec(innerText)) {
                if (!seenTags[result[0]]) {
                    toptext = toptext.replaceAll(result[0], "");
                    if (!this.settings.tagColors[result[1]]) {
                        this.settings.tagColors[result[1]] = randBriteCol();
                    }
                    toptext += `<span style="color:${this.settings.tagColors[result[1]]}">${result[0]}</span>`;
                    seenTags[result[0]] = true;
                }
            }
            topbar.innerHTML = toptext;
        }
    }
    let renderRichText = (id) => {
        let itemContainer = getContainer(id);
        let richtext = itemContainer.querySelector(`[data-role='richtext']`);
        if (!richtext) {
            richtext = htmlwrap(`<div data-role="richtext" contenteditable></div>`);
            itemContainer.appendChild(richtext);
        }
        richtext.innerText = polymorph_core.items[id][this.settings.dumpProp];
        richtext.style.display = "none";
    }

    container.on("updateItem", (d) => {
        if (d.sender == this) return;
        if (this.itemRelevant(d.id)) {
            renderTopbar(d.id);
            renderRichText(d.id);
            this.currentFilters[d.id] = generateFilter(polymorph_core.items[d.id][this.settings.dumpProp]);
        }
    })

    let expand = (id) => {
        //hide all others
        Array.from(this.rootdiv.querySelectorAll("[data-role='richtext']")).forEach(i => {
            //i.style.height = "0px";
            i.style.display = "none";
        });
        let richtext = this.rootdiv.querySelector(`[data-item='${id}'] [data-role='richtext']`);
        richtext.style.display = "block";
        richtext.focus();
    }

    this.rootdiv.addEventListener("click", (e) => {
        if (e.target.matches("[data-role='topbar']")) {
            let cid = e.target.parentElement.dataset.item;
            container.fire('focusItem', { id: cid, sender: this });
            expand(cid);
        }
    })

    let upc = new capacitor(300, 40, (id) => {
        container.fire("updateItem", {
            id: id,
            sender: this
        });
    })

    let deleteItem = (id) => {
        delete polymorph_core.items[id][this.settings.filter];
        delete this.currentFilters[id];
        if (this.rootdiv.querySelector(`[data-item='${id}']`)) this.rootdiv.querySelector(`[data-item='${id}']`).remove();
    }

    this.rootdiv.addEventListener("keydown", (e) => {
        if (e.target.matches("[data-role='richtext']")) {
            if ((e.key == "ArrowDown" || e.key == "ArrowUp") && !e.getModifierState("Shift")) {
                let ckey = e.key;
                let ctarget = e.target;
                let baseElement = e.target.getRootNode();
                range = baseElement.getSelection().getRangeAt(0);
                let preRange = range.startOffset;
                let preEl = range.startContainer;
                setTimeout(() => {
                    range = baseElement.getSelection().getRangeAt(0);
                    if (preRange == range.startOffset && preEl == range.startContainer) {
                        if (ckey == "ArrowDown") {
                            if (ctarget.parentElement.nextElementSibling) {
                                toFocusOnSpan = ctarget.parentElement.nextElementSibling.dataset.item;
                                expand(toFocusOnSpan);
                            } else if (ctarget.innerText) {
                                let oldID = ctarget.parentElement.dataset.id;
                                this.createItem(oldID);
                            }
                        } else {
                            if (ctarget.parentElement.previousElementSibling) {
                                let toFocusOnSpan = ctarget.parentElement.previousElementSibling.dataset.item;
                                if (toFocusOnSpan) expand(toFocusOnSpan);
                            }
                        }
                    }
                }, 100);
            }
        }
    });

    this.rootdiv.addEventListener("keyup", (e) => {
        if (e.target.matches("[data-role='richtext']")) {
            if (e.key == "Tab") e.preventDefault();
            else {
                let cid = e.target.parentElement.dataset.item;
                upc.submit(cid);
                if (e.target.innerText == "") {
                    //delete the item
                    container.fire("deleteItem", { id: cid, sender: this });
                    deleteItem(cid);
                } else {
                    polymorph_core.items[cid][this.settings.dumpProp] = e.target.innerText;
                    container.fire("updateItem", { id: cid, sender: this });
                    this.currentFilters[cid] = generateFilter(polymorph_core.items[cid][this.settings.dumpProp]);
                    renderTopbar(cid);
                }
            }
        }
    })

    container.on("deleteItem", (d) => {
        if (d.sender == this) return;
        deleteItem(d.id);
    });

    //polymorph_core will call this when an object is focused on from somewhere
    container.on("focusItem", (d) => {
        let id = d.id;
        if (d.sender == this) return;
        if (this.rootdiv.querySelector(`[data-item='${id}'] [data-role='richtext']`)) {
            expand(id);
        }
    });

    this.dialogDiv = document.createElement("div");
    let options = {
        filter: new _option({
            div: this.dialogDiv,
            type: "text",
            object: this.settings,
            property: "filter",
            label: "Filter:"
        })
    }
    this.showDialog = () => {
        for (i in options) options[i].load();
    }



});