function setup(passedSVG=null){
    svgElement = SVGElement(width, height, width, height, svgClass, svgID);
    var svgContainer = document.getElementById("svg-container");
    
    svgContainer.innerHTML = "";
    svgContainer.appendChild(svgElement);
    mode = document.getElementById("mode");

    svg = new Svg(svgElement, "tile_" + tileCounter.toString(),  LAYERSELECTED, layerInfo, outlineLayer, orientLayer ,invalidCSS);
    if(passedSVG != null){
        svg = passedSVG;
        svg.unmount();
        svg.addNewElement(svgElement);
        svg.element = svgElement;
    }
    selectpointsmode = new SelectPoints(svg);
    orientlinemode = new OrientLineMode(svg, selectpointsmode, orientLayer);
    selectpointsmode.orientlinemode = orientlinemode;
    
    select = new Select(svg, selectpointsmode);
    var outlinemode = new OutlineMode(svg, selectpointsmode, outlineLayer);
    selectpointsmode.outlinemode = outlinemode;
    select.orientlinemode = orientlinemode;
    

    layerthumbnails = new SvgUI(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon,  selectedCSS);
    
    
    const compliance = () => {
        svg.errorCheckOutline();
        svg.errorCheckOrient();
    }

    select.compliance = compliance;
    outlinemode.compliance = compliance;
    selectpointsmode.compliance = compliance;
    orientlinemode.compliance = compliance;
    var constructionmode = new ConstructionMode(svg);
    var eventMap = {};


    eventMap[drawMode] = {};
    eventMap[selectMode] = {};
    eventMap[drawMode][constructionLayer] = constructionmode;
    eventMap[drawMode][outlineLayer] = outlinemode;
    eventMap[drawMode][orientLayer] = orientlinemode;
    eventMap[selectMode][constructionLayer] = select;
    eventMap[selectMode][outlineLayer] = select;
    eventMap[selectMode][orientLayer] = select;
    
    const mouseDown = (e) => {
        pressed = true;
        eventMap[SETMODE][LAYERSELECTED].mouseDownHandler(e);
    }
    const mouseMove = (e) =>{
        if(pressed){
            eventMap[SETMODE][LAYERSELECTED].mouseMoveHandler(e);
        }
    }
    const mouseUp = () =>{
        pressed = false;
        eventMap[SETMODE][LAYERSELECTED].mouseUpHandler();
        layerthumbnails.reRenderLayer(svg.layerSelected);
    }
    
    const doubleClick = (e) => {
        if(SETMODE == selectMode){
            select.doubleClickHandler(e);
        }
    }
    
    svgElement.addEventListener("mousedown", mouseDown);
    svgElement.addEventListener("mousemove", mouseMove);
    svgElement.addEventListener("mouseup", mouseUp);
    svgElement.addEventListener("dblclick", doubleClick);
    $("#" + svgID).mouseleave(function () {
        mouseUp()
    });
    
    $(document).keyup(function(e){
        if(e.key === "Backspace") {
            select.deleteSelected();
        }
    });
    console.log(layerthumbnails);
    layerthumbnails.layerChange[constructionLayer]();
}

async function rerenderAssemblage(){
    assemblerElement = await  assemblerSetup(thumbnailsobj.export(), labelmanager.export(), assemblageWidth, assemblageHeight, tileScale);
}

function SVGElement(boxWidth=600 , boxHeight=400,viewBoxWidth = 100, viewBoxHeight=75,  htmlClass="svg", id){
    var xmlns = "http://www.w3.org/2000/svg";
    var svgElem = document.createElementNS(xmlns, "svg");
    svgElem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElem.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgElem.setAttributeNS(null, "viewBox", "0 0 " + boxWidth + " " + boxHeight);
    svgElem.setAttributeNS(null, "width", viewBoxWidth);
    svgElem.setAttributeNS(null, "height", viewBoxHeight);
    svgElem.setAttributeNS(null, "id", id);
    svgElem.setAttributeNS(null, "class", htmlClass)
    return svgElem;
}
function makeDiv(id, text="", classCSS=""){
    
    var block_to_insert = document.createElement( 'div' );
    block_to_insert.id = id;
    
    block_to_insert.innerHTML = text;
    block_to_insert.setAttributeNS(null, "class",  classCSS);

    return block_to_insert;
}
function makeButton(text){
    var button = document.createElement( 'button' );
    button.innerHTML = text
    return button
}

class SvgUI{
    constructor(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon, selectedCSS){
        this.svg = svg;
        this.select = select;
        this.layerElements = {};
        this.layerDivElements= {};
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.layerDivID = layerDivID;
        this.icon = clearicon;
        this.selectedCSS = selectedCSS
        this.layerDivElement =  document.getElementById(this.layerDivID)
        this.modeButtons = {}
        this.layerChange = {};
        this.modeEventListener = {}
        this.destroyLambda = () => {
            var layerContainer = document.getElementById(this.layerDivID);
            layerContainer.innerHTML = ""
        }
        modeInfo.forEach(mode =>{
            var modeButton = document.getElementById(mode.modeButtonDivID);
            this.modeButtons[mode.modeName] = modeButton;
            var modeEventListener = this.changeModeLambda(mode.modeName,modeButton);
            modeButton.onclick = modeEventListener;
            this.modeEventListener[mode.modeName] = modeEventListener;
        })
        layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(width, height, thumbnailWidth, thumbnailHeight, "svg", layer.name);
            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
            var clearButton = makeButton(this.icon + " clear layer");
            thumbnailDIV.appendChild(thumbnailElemNS);
            thumbnailDIV.appendChild(clearButton);
            this.layerDivElement.append(thumbnailDIV);
            var thumbnailElem = document.getElementById(layer.name);
            this.layerElements[layer.name] = thumbnailElem;
            this.layerDivElements[layer.name] = thumbnailDIV;
            this.layerChange[layer.name] =  this.changeLayerLambda(layer.name, thumbnailDIV);
            thumbnailDIV.addEventListener("mousedown", this.layerChange[layer.name], false, );
            clearButton.onclick = this.clearLayerLambda(layer.name);
        });
    }
    changeModeLambda(modeName, modeButton){
        const changeMode = e =>{
            Object.entries(this.modeButtons).forEach(([_, div]) =>div.classList.remove(this.selectedCSS))
            modeButton.classList.add(this.selectedCSS);
            this.select.resetSelection();
            SETMODE = modeName;
            
        }
        return changeMode;
    }
    changeLayerLambda(name, thumbnailDIV ){
        const changeSVGLayer = e =>{
            this.select.resetSelection();
            LAYERSELECTED = name;
            Object.entries(this.layerDivElements).forEach(([_, div]) => div.classList.remove(this.selectedCSS))
            thumbnailDIV.classList.add(this.selectedCSS);
            this.svg.layerSelected = name;
        }
        return changeSVGLayer;
    }
    clearLayerLambda(name){
        const clearSVGLayer = (e) => {
            this.svg.clearLayer(name);
            this.svg.reRender();
            this.reRenderLayer(name);
        };
        return clearSVGLayer
    }
    destroy(){
        var layerContainer = document.getElementById(this.layerDivID);
        layerContainer.innerHTML = ""
    }
  
    reRenderLayer(layerName){
        var lines = this.svg.getLayer(layerName);
        var thumbnailElement = this.layerElements[this.svg.layerSelected]
        lines.forEach(line => {
            line.addToParentElement(thumbnailElement);
        });
    }
}



class Thumbnails{
    constructor(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDiv, trashIcon, saveIcon, editIcon, resetLambda,  sessionStorageKey){
        this.thumbnailDivID = thumbnailDiv;
        this.thumbnails = {};
        this.numberID = 0;
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.trashicon = trashIcon;
        this.saveicon = saveIcon;
        this.editicon = editIcon;
        this.thumbnailDivs = {};
        this.sessionStorageKey = sessionStorageKey;
        this.resetLambda = resetLambda;

        if(sessionStorage.getItem(this.sessionStorageKey)){
            this.loadFile(JSON.parse(sessionStorage.getItem(this.sessionStorageKey)));
        }
    }

    removeLabel(label){
        Object.entries(this.thumbnails).forEach(([_, nail]) => {
            nail.removeLabel(label);
            nail.reRender();
        });
        svg.removeLabel(label);
        svg.reRender();
    }
    loadFile(project){

        Object.entries(project.drawings).forEach(([key, svgJSON], index) => {
            // var svgElement = SVGElement(width, height, width, height, "svg", index.toString());
            var svgClass =  new Svg(null, svgJSON.name,  constructionLayer, layerInfo, outlineLayer, orientLayer , invalidCSS);
            svgClass.fromJSON(svgJSON);
      
            this.addThumbnail(svgClass);
        });
        
        labelManagerFromJSON(project.labels, labelmanager.width, labelmanager.height)

        this.render();

    }
    addThumbnail(svg){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        var thumbnailDIV = makeDiv(id + "_container", svg.name, this.thumbnailDivClass);
        var deleteButton = makeButton(this.trashicon +  " delete");
        var duplicateButton = makeButton("duplicate");
        
     
        var loadButton = makeButton(this.editicon +  "edit");
        thumbnailDIV.appendChild(thumbnailElemNS);
        thumbnailDIV.appendChild(deleteButton);
      
        thumbnailDIV.appendChild(loadButton);
        thumbnailDIV.appendChild(duplicateButton);

        $("#" + this.thumbnailDivID).append(thumbnailDIV);
        var thumbnailElement = document.getElementById(id);
        this.thumbnailDivs[thumbnailDIV.id] = thumbnailDIV;
        
        svg.unmount();
        svg.addNewElement(thumbnailElemNS);
        svg.element = thumbnailElemNS;
        this.thumbnails[thumbnailElement.id] = svg;


        deleteButton.onclick = this.deleteDrawingLambda(thumbnailDIV,thumbnailElement);
      
        loadButton.onclick = this.loadDrawingLambda(thumbnailDIV,thumbnailElement, svg);
        duplicateButton.onclick = this.duplicateDrawingLambda(svg);
    }
    duplicateDrawingLambda(svg){
        const duplicateDrawing = (e) =>{
            var svgJSON = JSON.parse(JSON.stringify(svg));
            var svgClass =  new Svg(null, svgJSON.name,  constructionLayer, layerInfo, outlineLayer, orientLayer , invalidCSS);
            svgClass.fromJSON(svgJSON);
            this.addThumbnail(svgClass);
        } 
        return duplicateDrawing;

    }
    loadDrawingLambda(thumbnailDIV,thumbnailElement, svg){
        const svgDelete = this.deleteDrawingLambda(thumbnailDIV, thumbnailElement);
        const svgEdit = this.editDrawingLambda(svg);
        const svgLoad = (e) => {
            this.resetLambda();
            svgDelete();
            svgEdit();
        }
        return svgLoad;

    }
    editDrawingLambda(svg){
        const editDrawing = (e) =>{
            svg.unmount();
            setup(svg);
        }
        return editDrawing

    }
    downloadDrawingLambda(svg){
        const downloadDrawing = (e) => {
            downloadSVG(svg.element, svg.name);
        }
        return downloadDrawing;

    }
    deleteDrawingLambda(thumbnailDIV,thumbnailElement){
        const deleteDrawing = (e) => {
            delete this.thumbnails[thumbnailElement.id];
            delete this.thumbnailDivs[thumbnailDIV.id];
            this.render();
        }
        return deleteDrawing;

    }
    render(){
        var thumbnailDiv = document.getElementById(this.thumbnailDivID)
        thumbnailDiv.innerHTML = "";
        Object.entries(this.thumbnailDivs).forEach(([_, elem]) => thumbnailDiv.appendChild(elem))
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
    downloadProject(){
            var exportName = "project_file"
            var project = {
                labels: labelmanager.export(),
                drawings: this.thumbnails,
            }
            //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser

            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
            sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(project));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
    }
}


function reflectOverX(){
    svg.reflectOverX(Math.trunc(height));
}
function reflectOverY(){
    svg.reflectOverY(Math.trunc(width));
}

function downloadAssemblage(){
    if(assemblerElement){
        downloadSVG(assemblerElement, "assemblage")
    }
}
async function parseJsonFile(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = event => resolve(JSON.parse(event.target.result))
      fileReader.onerror = error => reject(error)
      fileReader.readAsText(file)
    })
  }

async function loadJSON(){
    var file = document.getElementById("load-project").files[0];
    const object = await parseJsonFile(file);
    console.log(object);
    thumbnailsobj.loadFile(object, toParse=false);
}

function saveTile(){
  
    var [b, errorString] = svg.canExport();
    if(!b){
        console.log(errorString);
        openModal(errorString);
        return;
    }
    reset();
}

function reset(){
    thumbnailsobj.addThumbnail(svg);
    layerthumbnails.destroy();
    setup();
    thumbnailsobj.render();
}

var tileCounter = 0;






const pixelsInInch = 200;
const assemblageWidthInches= 4;
const assemblageHeightInches = 5; 

// scale organ
// const tileScale = 0.50;
// const assemblageWidthInches= 30 - (2 * 2);
// const assemblageHeightInches = 72 - (2 * 2); 
// scale plants
var tileScale = 0.50;
// scale electronics
// const tileScale = 0.60;


var assemblageWidth = Math.trunc(pixelsInInch * assemblageWidthInches);
var assemblageHeight = Math.trunc(pixelsInInch * assemblageHeightInches);
const width = 3 * pixelsInInch;
const height = 3 * pixelsInInch;
const thumbnailHeight = Math.ceil(height / 4);
const thumbnailWidth = Math.ceil(width / 4);
const thumbnailDivClass = "thumbnail-container"
const thumbnailDivID = "thumbnail-container"
const selectedCSS = "selected-element" 
const layerDivID = "layer-container"
const svgID = "svgElement";
const svgClass = "svg";
const drawMode = "draw";
const drawModeButtonID = "draw-button";
const selectMode = "select";
const selectModeButtonID = "select-button";

document.getElementById("scale-range").value = tileScale  * 100;
document.getElementById("scale-text").innerHTML = tileScale;
document.getElementById("assemblage-width-input").value = assemblageWidth;
document.getElementById("assemblage-height-input").value = assemblageHeight;



document.getElementById("scale-range").oninput = function() {
    tileScale = this.value / 100;
    document.getElementById("scale-text").innerHTML = tileScale;
}
document.getElementById("assemblage-width-input").addEventListener("change",function (e) {
    assemblageWidth = this.value;
    console.log(this.value);
    assemblerElement =  assemblerSetup([], {}, assemblageWidth, assemblageHeight, tileScale);
})
document.getElementById("assemblage-height-input").addEventListener("change",function (e) {
    assemblageHeight= this.value;
    assemblerElement =  assemblerSetup([], {}, assemblageWidth, assemblageHeight, tileScale);
})


var SETMODE = drawMode;
const modeInfo = [
    {
        modeName: drawMode,
        modeButtonDivID: drawModeButtonID
    },
    {
        modeName: selectMode,
        modeButtonDivID: selectModeButtonID
    },
]
var pressed = false;
const outlineLayer = "border";
const orientLayer = "orient";
const constructionLayer = "construction";
var LAYERSELECTED = constructionLayer;
const trashicon = `<i class="fa fa-trash" aria-hidden="true"></i>`
const clearicon = `<i class="fa fa-times" aria-hidden="true"></i>`
const savefileicon = ` <i class="fa fa-download" aria-hidden="true"></i> `
const editicon = `<i class="fa fa-pencil" aria-hidden="true"></i> `
const sessionStorageKey = "project"
const invalidCSS = "invalid"
var svgElement = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var selectpointsmode = null;
var orientlinemode = null;
var assemblerElement =  assemblerSetup([], {}, assemblageWidth, assemblageHeight, tileScale);
const layerInfo = 
[
    {
        name: outlineLayer,
        color: "#A000F0",
    },
    {
        name: orientLayer,
        color: "#00FF00",
    },
    {
        name: constructionLayer,
        color: "#000000",
    }
]



setup();
var thumbnailsobj = new Thumbnails(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDivID, trashicon,savefileicon, editicon, layerthumbnails.destroyLambda, sessionStorageKey );
thumbnailsobj.render();

function downloadProject(){
    thumbnailsobj.downloadProject();
}


if (typeof(module) !== "undefined") {
    module.exports.layerInfo = layerInfo;
    module.exports.SVGElement = SVGElement;
}