const debug = false;
const recLim = 100;


function inside(point, vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
  
  var x = point.x, y = point.y;
  
  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i].x, yi = vs[i].y;
      var xj = vs[j].x, yj = vs[j].y;
      
      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  
  return inside;
};

function draw(assemblage, visualize=false){
    var polyLines = [];
    for(var l = 0; l< assemblage.renderStack.length; l++){
        var drawing = assemblage.renderStack[l];
        polyLines.push(...drawing.getLines());
    }
    if(assemblage.tempDrawing != null && visualize){
      polyLines.push(...assemblage.tempDrawing.getLines());
    }
    return polyLines;
}
const P2ArrayToArray = arr => arr.reduce((acc, point)=> {

    acc.push(point.x);
    acc.push(point.y);
  
  return acc;
}, []);

class Assemblage{
  constructor(drawingJSONS, recursiveLimit, attachments, width, height, tileScale){
    this.width = width;
    this.height = height; 
    this.referenceDrawingJsons = drawingJSONS;
    this.recursiveLimit = recursiveLimit;
    this.attachments = attachments;
    this.tileScale = tileScale;
    this.drawingStack = [];
    this.renderStack = [];
    this.tempDrawing = null;
    this.xform = "";
    this.checkRect = false;
    this.bbox = null;
    this.current = 0;
    this.historyStack = [];
    this.uniqueId = 0;

  }
  addToHistory(){
    this.current ++;
    this.historyStack = this.historyStack.slice(0, this.current)
    this.historyStack.push(structuredClone({
      drawingStack: this.drawingStack,
      renderStack: this.renderStack,
    }));
    console.log(this.renderStack.length);
  }
  redo(){
    
    this.current = Math.min(this.historyStack.length -1, this.current + 1);
    var past = this.historyStack[this.current];
    this.renderStack = past.renderStack.map(drawing => 
      {
        var copy = this.deepCopies()[0]
        copy.fromHistory(drawing);
        return copy;
      });
    this.drawingStack = past.drawingStack.map(drawing => 
    {
      var copy = this.deepCopies()[0]
      copy.fromHistory(drawing);
      return copy;
    });
    console.log(this.renderStack.length);
   
  }
  undo(){
    this.current = Math.max(0, this.current - 1);
    var past = this.historyStack[this.current];
    this.renderStack = past.renderStack.map(drawing => 
      {
        var copy = this.deepCopies()[0]
        copy.fromHistory(drawing);
        return copy;
      });
    this.drawingStack = past.drawingStack.map(drawing => 
    {
      var copy = this.deepCopies()[0]
      copy.fromHistory(drawing);
      return copy;
    });
    console.log(this.renderStack.length);
    
    return;
  }

  
  outsideDims(newDrawing){
    var newBorders = this.getPolygonBorders()
    newBorders.push(newDrawing.polygonBorder)
    const polygonPoints =newBorders.flat(1);
    const bbox = get_bbox(polygonPoints);
    const height = bbox[1].y - bbox[0].y;
    const width = bbox[1].x - bbox[0].x;
    return height < this.height && width < this.width;
  }
  checkIntersect(newDrawing){
    


    if(!this.outsideDims(newDrawing)){
      return false;
    }
    
    var polygonList = this.getPolygonBorders();
    var b = polygonList.some(polygon => {
      return newDrawing.polygonBorder.some(point => {
        return inside(point, polygon);
      });
    });

    if(this.checkRect){
      return !b && this.checkInRect(newDrawing);
    }
    return !b;
  }
  checkInRect(newDrawing){
    var b = newDrawing.polygonBorder.every(point => {
      if((this.bbox[0].x <= point.x && point.x <=this.bbox[1].x ) && (this.bbox[0].y <= point.y && point.y <= this.bbox[1].y)){
        return true;
      }
      return false;
    });
    return b;
  }
  deepCopies(){
    return this.referenceDrawingJsons.map(json => new Drawing(json, this.attachments, this.tileScale));
  }
  baseIndexes(){
    var indices = this.referenceDrawingJsons.map((_, index)=>index);
    var copies =  this.deepCopies();

    indices = indices.filter(index => {
      return copies[index].orientLines.length > 2;
    });
    if(indices.length > 0){
      return shuffleArray(indices);
    }
  
    return this.shuffledDrawingIndexes();
  }
  shuffledDrawingIndexes(){
    if(!debug){
      return shuffleArray(this.referenceDrawingJsons.map((_, index)=>index));
    } else{
      return this.referenceDrawingJsons.map((_, index)=>index);
    }
  }
  
  addDrawingToAssemblage(drawing){
    drawing.drawingID = this.uniqueId;
    this.uniqueId += 1;
    this.renderStack.push(drawing);
    this.drawingStack.unshift(drawing);
  }
  getPolygonBorders(){
    var borders = this.renderStack.map(drawing => drawing.polygonBorder);
   
    return borders;
  }
  setRect(){
    var lineList =  this.renderStack.map(drawing => drawing.lines);
    if(this.tempDrawing != null){
      lineList.push(this.tempDrawing.lines);
  
    }
    var newLineList = lineList.flat(2);
    var bBox = get_bbox(newLineList);
    // var scalingFactor = Math.min(this.width / (bBox[1].x - bBox[0].x), this.height / (bBox[1].y - bBox[0].y));
    const tMat = translateMatrix( bBox[0].x,  bBox[0].y);
    // const scMat = scaleMatrix(1.0 / scalingFactor, 1.0 /  scalingFactor);
    const cMat = composeTransforms([tMat]);
    this.bbox = xformLine([{x: 0, y: 0}, {x: this.width, y: this.height}], cMat);
  
  }
  fitToCanvas(){
    var lineList =  this.renderStack.map(drawing => drawing.lines);
    if(this.tempDrawing != null){
      lineList.push(this.tempDrawing.lines);
  
    }
    var newLineList = lineList.flat(2);
    var bBox = get_bbox(newLineList);
    // var scalingFactor = Math.min(this.width / (bBox[1].x - bBox[0].x), this.height / (bBox[1].y - bBox[0].y));
    const tMat = translateMatrix(-1 * bBox[0].x, -1 * bBox[0].y);
    const cMat = composeTransforms([tMat]);
    this.xform = xformToString(cMat);
  }
}

function stackInit(assemblage){
  var initIndexes = assemblage.baseIndexes();
  if(initIndexes.length == 0){
    return [false, assemblage];
  }
  let drawingObj = assemblage.deepCopies()[initIndexes.pop()];
  assemblage.addDrawingToAssemblage(drawingObj);
  return [true, assemblage];
}


function makeStack(assemblage, autoscale) {
  
  
  //caps recursive limit on drawing fitting incase loops forever (probabilistically can happen)
  
  while(assemblage.drawingStack.length > 0 && assemblage.recursiveLimit > 0 ){
    // pops a drawings off the stack
    var drawing = assemblage.drawingStack.pop(0);
    
    // goes through each of the openings of the drawing
    for(var i = 0; i < drawing.orientLines.length; i++){
      //exhausts list of drawings
    
      var drawingOptionsIndexes = assemblage.shuffledDrawingIndexes();
      while(drawing.orientLines[i].attachedDrawing == null && drawingOptionsIndexes.length  > 0 ){
    
        var newDrawingIndex = drawingOptionsIndexes.pop();
        var labelOptions = assemblage.attachments[drawing.orientLines[i].label]
        var newPoints =[];
        if(!debug){
          newPoints = shuffleArray((assemblage.deepCopies()[newDrawingIndex]).getOrientIndexOptions(labelOptions));
        } else{
          newPoints = (assemblage.deepCopies()[newDrawingIndex]).getOrientIndexOptions(labelOptions);
        }
        while(newPoints.length > 0){
          var newPoint = newPoints.pop();
          var newDrawing = assemblage.deepCopies()[newDrawingIndex];
          const scaleSuccesful = drawing.finewDrawing(newDrawing, i, newPoint, autoscale);
          const b = scaleSuccesful && assemblage.checkIntersect(newDrawing);      
          if(b){
            assemblage.addDrawingToAssemblage(newDrawing);
            drawing.orientLines[i].attachedDrawing = newDrawing;
            newDrawing.orientLines[newPoint].attachedDrawing = drawing;
          } else{
            newDrawing = null;
          }
        }
      
      }
    }
    assemblage.recursiveLimit -= 1;
    
  }
  return assemblage
 
}



class Drawing {

  constructor (object, attachments, tileScale){
    this.drawingID = null;
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("border")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.polygonBorder.push(this.polygonBorder[0]);
    this.orient = JSON.parse(JSON.stringify(object.getOrientLayer("orient")));
    this.orientLabels = JSON.parse(JSON.stringify(object.getLabels()));
    this.orientLines = [];
    this.attachments = attachments;

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].points.slice(0, 2),
          vector: this.getRay(this.orient[i].points.slice(0, 2)),
          attachedDrawing: null,
          //TODO: fix,
          label: this.orientLabels[this.orient[i].id],
          index: i,
        }
        this.orientLines.push(orientLine)
    }
    const scmat  = scaleMatrix(tileScale, tileScale);
    const xformDrawing = line => {
      return xformLine(line, scmat)
    }
    this.applyLambdaToLines(xformDrawing);
    

  }
  fromHistory(drawing){
    this.lines = drawing.lines;
    this.polygonBorder = drawing.polygonBorder ;
    this.polygonBorder = drawing.polygonBorder ;
    this.orient = drawing.orient ;
    this.orientLabels = drawing.orientLabels;
    this.orientLines = drawing.orientLines ;
    this.attachments =  drawing.attachments;
    this.drawingID = drawing.drawingID;
  }
  getRays(points){
  
    const pointSum = {
      x: points[0].x + points[1].x, 
      y: points[0].y + points[1].y
    };
    const average = {
      x: pointSum.x / 2.0,
      y: pointSum.y / 2.0
    };
    const vector = {
      x: points[1].x - points[0].x,
      y: points[1].y - points[0].y,
    };
    const ray1 = {
      x: (vector.y * -1),
      y: vector.x,
    };

    const ray2 = {
      x: vector.y,
      y: (vector.x * -1),
    };
    const normal1 = {
      x: ray1.x + average.x,
      y: ray1.y + average.y,
    };

    const normal2 = {
      x:  ray2.x + average.x,
      y:  ray2.y + average.y,
    };
    return [[average, ray1 ],[average, normal1], [average, ray2 ], [average, normal2]] 
  }
  getRay(line){
 
    const [ray1, normal1, ray2, normal2] = this.getRays(line);
    const polygon = P2ArrayToArray(this.polygonBorder);
    const raycast1 = PolyK.Raycast(polygon, ray1[0].x, ray1[0].y,  ray1[1].x, ray1[1].y);
    const raycast2 = PolyK.Raycast(polygon, ray2[0].x, ray2[0].y,  ray2[1].x, ray2[1].y);
    if(raycast1 == null && raycast2 == null){
      return normal1;
    } else if(raycast1 == null){
      return normal1;
    } else if(raycast2 == null){
      return normal2;
    } else if (raycast1.dist < raycast2.dist){
      return normal2;
    } else {
      return normal1;
    }
  }
  getOrientIndexOptions(targetLabels){
    return this.orientLines
    .filter(line => targetLabels.includes(line.label))
    .map(line => line.index);
  }
  getLines(){
    
    var retLines = JSON.parse(JSON.stringify(this.lines));
    
    if(debug){
      var orientLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.opening)));
      var vectorLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.vector)));
      retLines.push(...orientLines);
      retLines.push(...vectorLines);
      retLines.push(this.polygonBorder);
    }
    return retLines;
  }

  applyLambdaToLines(lambda){
    this.lines = this.lines.map(l => lambda(l))
    this.orientLines = this.orientLines.map((o, index) => 
      { 
        return {
          opening: lambda(o.opening),
          vector: lambda(o.vector),
          attachedDrawing: o.attachedDrawing,
          label: o.label,
          index: index,
        }
      })
    this.polygonBorder = lambda(this.polygonBorder);
  }
  
  finewDrawing(newDrawing, thisOrientationIndex, newDrawingIndex, autoscale){
    var target = this.orientLines[thisOrientationIndex]
    var start = newDrawing.orientLines[newDrawingIndex];

    const toOrigin = (v) =>{
      return {
        x: v[1].x - v[0].x, 
        y: v[1].y - v[0].y
      }
    }
  
    const magnitude = (v) => {
      const y = v[1].y - v[0].y;
      const x = v[1].x - v[0].x;
      return Math.sqrt((y * y) + (x * x))
    }

    const targetOrientMag = magnitude(target.opening);
    const startOrientMag = magnitude(start.opening);
    // start size * (target size/ start size) = target size

    const a = toOrigin(start.vector);
    const b = toOrigin(target.vector);
    const aTheta = math.atan2(a.y, a.x);
    const bTheta = math.atan2(b.y, b.x);
    const atan2Theta = aTheta - bTheta;
   
    // add 180 so that they rotate facing each other 
    const rotationAngle = (-1 * atan2Theta) + Math.PI;
  
    const tMat1 = translateMatrix(-1 * start.vector[0].x, -1 * start.vector[0].y);
    const scaleFactor = targetOrientMag/ startOrientMag
    const scMat = scaleMatrix(scaleFactor, scaleFactor);
    const rMat = rotationMatrix(rotationAngle);
    const tMat2 = translateMatrix(target.vector[0].x, target.vector[0].y);
    var matList = [];
    if(autoscale){
      matList = [tMat1, scMat, rMat, tMat2];
    } else{
      matList = [tMat1, rMat, tMat2]
    }
  
    const transforms = composeTransforms(matList);

    const xformDrawing = line => {
      return xformLine(line, transforms)
    }
  
    newDrawing.applyLambdaToLines(xformDrawing);

    // return true
    return (autoscale === false) ||  (autoscale === true && (0.6 < scaleFactor && scaleFactor < 2.5));

  }
}

// applies matrix transform to point (x, y)
function xformLine(line, rotationMatrix){
  return line.map(p => xformPoint(rotationMatrix, p.x, p.y))
}
function xformPoint(xform, x, y){
  const newX = xform[0][0] * x + xform[0][1] * y + xform[0][2];
  const newY = xform[1][0] * x + xform[1][1] * y + xform[1][2];
  return {x: newX, y: newY};
}

function draw_svg(element, polylines, matrix){
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  element.appendChild(g);
  var lineObjs = polylines.map((line, index) => {
    var lineObj = new Line("assembler_" + index.toString())
    lineObj.points = line;
    lineObj.reRender();
    return lineObj
  });
  lineObjs.forEach(line => line.addToParentElement(g, "assembler"));
  g.setAttribute("transform", matrix);
  return;
}

function visualize(assemblage){
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(assemblage.width, assemblage.height, assemblage.width, assemblage.height, "svg", "assembler-svg");
  container.appendChild(element);
  var polyLines = draw(assemblage, true);
  draw_svg(element, polyLines, assemblage.xform);
  return element
}

function addRandomNewTree(assemblage, autoscale){
  // async function addRandomNewTree(assemblage, autoscale){
  
  // var initIndexes = assemblage.shuffledDrawingIndexes();
  var initIndexes = assemblage.baseIndexes();
  let drawingObj = null;
  let outside = true;
  while(outside && initIndexes.length > 0 ){
    drawingObj = assemblage.deepCopies()[initIndexes.pop()];
    const tx = (Math.random() * Math.abs(assemblage.bbox[1].x - assemblage.bbox[0].x)) + assemblage.bbox[0].x;
    const ty = (Math.random() * Math.abs(assemblage.bbox[1].y - assemblage.bbox[0].y)) + assemblage.bbox[0].y;
    const thetaRand = (Math.random() * 2 * Math.PI);
    const tMat = translateMatrix(tx, ty);
    const rMat = rotationMatrix(thetaRand);
    const composed = composeTransforms([rMat, tMat])
    const xformDrawing = line => {
      return xformLine(line, composed)
    }
    drawingObj.applyLambdaToLines(xformDrawing);
    outside = !assemblage.checkIntersect(drawingObj);    
  }
  if(outside){
    console.log("returning!!")
    return;
    
  }
 
  assemblage.addDrawingToAssemblage(drawingObj);

  // assemblage = await makeStack(assemblage, autoscale);
  assemblage = makeStack(assemblage, autoscale);
  assemblage.addToHistory();
  return;
}
function assemblerSetup(drawings, attachments, width, height, tileScale){
  const assemblageSVGId = "assembler-svg";
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", assemblageSVGId);
  container.appendChild(element);
  var autoscale = document.getElementById("autoscale-check").checked;
  let assemblageObj = new Assemblage(drawings, recLim, attachments, width, height, tileScale);

  let [init, assemblage] = stackInit(assemblageObj);
  if(init){
    

    assemblage = makeStack(assemblage, autoscale);
    assemblage.fitToCanvas();
    assemblage.setRect();
    assemblage.checkRect = true;

    var element = visualize(assemblage);
    assemblage.addToHistory();

    document.getElementById("add-tree").onclick = () => {
      assemblage.recursiveLimit = recLim;
      console.log("adding new tree");
      addRandomNewTree(assemblage, autoscale);
      assemblage.fitToCanvas();
      assemblerElement = visualize(assemblage);
    }
    document.getElementById("undo").onclick = () =>{
      assemblage.undo();
      assemblerElement = visualize(assemblage);
    }
    document.getElementById("redo").onclick = () =>{
      assemblage.redo();
      assemblerElement = visualize(assemblage);
    }
    // document.getElementById("automate").onclick = () =>{
    //   var intervalLength = assemblage.renderStack.length;
    //   const startLength = assemblage.renderStack.length;
    //   var pastLength = assemblage.renderStack.length;
    //   while(assemblage.renderStack.length < startLength + 1000){
    //     document.getElementById("add-tree").click();
    //     // cleanUp(assemblage);
    //     assemblage.historyStack.pop();
    //     if(assemblage.renderStack.length < 1000 && assemblage.renderStack.length - pastLength < 15){
    //       console.log('drawing stack',assemblage.drawingStack.length );
    //       assemblage.renderStack = assemblage.renderStack.slice(0, pastLength);
    //       console.log('renderStack stack',assemblage.renderStack.length );
    //     }
    //     pastLength  = assemblage.renderStack. length;
    //     if(assemblage.renderStack.length - intervalLength > 50 ){
    //       assemblerElement = visualize(assemblage);
    //       document.getElementById("download-assemblage").click();
    //       intervalLength = assemblage.renderStack.length ;
    //     }
    //   }
    // }
    
  }
  return element;
  
}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
}
