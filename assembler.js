var width = 600;
var height = 400;
var recLim = 20;
var debugView = true;

const attachments = {
  'LIMB': 'MOUTH',
  'MOUTH': 'LIMB',
};

// let drawingFileNames = 
// ['bodies/two_fish.json', 
// 'bodies/snake.json','bodies/snapping_turtle.json','bodies/frog.json', 
// 'bodies/rooster.json','bodies/dog.json','bodies/rat.json']

// async function preload(){
//   //fine
//   var drawingJSONs = [];
//   for(var i = 0; i < drawingFileNames.length; i++){
//     const response = await fetch(drawingFileNames[i])
//     .then(response => response.json())
//     .then(json => {
//       return json;
//     })
//     drawingJSONs.push(response);
//   }
//   return drawingJSONs;
// }

function draw(renderStack){
    console.log(renderStack);
    var polyLines = [];
    for(var l = 0; l< renderStack.length; l++){
    var drawing = renderStack[l];
    polyLines.push(...drawing.getLines());
    // if(drawing.canShow){
    //   drawing.show();
    //   if(debugView){
    //     drawing.showSkeleton();
    //   }      
    // }
    }
    return polyLines;
}

class Assemblage{
  constructor(drawingJSONS, recursiveLimit, attachments){
    this.referenceDrawingJsons = drawingJSONS;
    this.recursiveLimit = recursiveLimit;
    this.attachments = attachments;
    this.polygonList = [];
    this.assemblage = [];
    this.drawingStack = [];
    this.renderStack = [];

  }
  shuffledDeepCopies(){
    var drawings = this.referenceDrawingJsons.map(json => new Drawing(json));
    return shuffleArray(drawings);
  }
  addDrawingToAssemblage(drawing){
    var drawingBorder = drawing.getPolygonBorder();
    this.polygonList.push(drawingBorder);
    this.drawingStack.unshift(drawing);  
    
  }
  randomDrawing(){
    var randomReferenceJson = this.referenceDrawingJsons[randomInteger(0, this.referenceDrawingJsons.length)];
    return new Drawing(randomReferenceJson);
  }
  scaleAssemblage(){
    var bBox = get_bbox(this.polygonList.flat(1));
    // TODO: scaling factor is wrong
    var scalingFactor = Math.min(width / bBox.w, height / bBox.h);
  
    for(var l = 0; l< this.renderStack.length; l++){
      var processingLamba = function (line) {
        return linePostProcessing(line, bBox.x, bBox.y, scalingFactor);
      };
      this.renderStack[l].applyLambdaToLines(processingLamba);
    }
  }
}

function makeStack(drawingJSONs) {
  let assemblage = new Assemblage(drawingJSONs, recLim, attachments);
  //caps recursive limit on drawing fitting incase loops forever (probabilistically can happen)
  let drawingObj = assemblage.randomDrawing();
  assemblage.addDrawingToAssemblage(drawingObj);

  while(assemblage.drawingStack.length > 0 && assemblage.recursiveLimit > 0){
    // pops a drawings off the stack
    var drawing = assemblage.drawingStack.pop(0);

    assemblage.renderStack.push(drawing);
    
     // goes through each of the openings of the drawing
    for(var i = 0; i < drawing.orientLines.length; i++){
      //exhausts list of drawings
      var drawingOptions = assemblage.shuffledDeepCopies();
      while(drawing.orientLines[i].attachedDrawing == false && drawingOptions.length  > 1 ){
      // spawns and attaches new drawing to the opening

        var newDrawing = drawingOptions.pop();
        var newPoints = newDrawing
                  .getOrientIndexOptions(assemblage.attachments[drawing.orientLines[i].label]);
        // TODO: replace with while after refactoring attachment code
        if(newPoints.length > 0){
          var newPoint = newPoints.pop();
          drawing.finewDrawing(newDrawing, i, newPoint);
          var b = polygonIntersectPolygonList(newDrawing.getPolygonBorder(), assemblage.polygonList)
          if(!b){
            assemblage.addDrawingToAssemblage(newDrawing);
            drawing.orientLines[i].attachedDrawing = true;
            newDrawing.orientLines[newPoint].attachedDrawing = true;

          } else{
            drawing.orientLines[i].attachedDrawing = false;
            newDrawing.orientLines[newPoint].attachedDrawing = false;
          }

        }
       
      }
    }
    assemblage.recursiveLimit -= 1;
  }
  assemblage.scaleAssemblage();
  return assemblage.renderStack;
}


class Drawing {
  constructor (object){
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("outline")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.orient = JSON.parse(JSON.stringify(object.getLayerAssembler("orient")));

    this.orientLines = [];

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].slice(0, 2),
          vector: this.orient[i].slice(2),
          attachedDrawing: false,
          //TODO: fix,
          label: attachments[i % attachments.length],
          index: i,
        }
        this.orientLines.push(orientLine)
    }

  }
  getOrientIndexOptions(targetLabel){

    return this.orientLines
    .filter(line => line.label == targetLabel)
    .map(line => line.index);
  }
  getLines(){
    return this.lines;
  }
  getPolygonBorder(){
    
    return this.polygonBorder;
  }
  
  linePreprocessing(lines){
    
    return lines.entries.map(lineObj => lineObj.getPointsArray());
  }

  applyLambdaToLines(lambda){
    this.lines = this.lines.map(l => lambda(l))
    this.orientLines = this.orientLines.map(o => 
      { 
        return {
          opening: lambda(o.opening),
          vector: lambda(o.vector),
          attachedDrawing: o.attachedDrawing,
          label: o.label
        }
      })
    this.polygonBorder = lambda(this.polygonBorder);
  }
  
  finewDrawing(other, myOrientLine, theirOrientLine){
    var vectorMe = this.orientLines[myOrientLine].vector;
    var openingMe = this.orientLines[myOrientLine].opening;
    var openingMeD = this.arrayDist(openingMe);
    var vectorOther = other.orientLines[theirOrientLine].vector;
    var openingOther = other.orientLines[theirOrientLine].opening;
    var openingOtherD = this.arrayDist(openingOther);
    var scale = openingMeD / openingOtherD;
    
    var scaleLambda = function (line) {
      return scaleLine(line, scale);
    };
    other.applyLambdaToLines(scaleLambda);

    vectorOther = JSON.parse(JSON.stringify(other.orientLines[theirOrientLine].vector));

    var vMe = [vectorMe[1][0] - vectorMe[0][0],  vectorMe[1][1] - vectorMe[0][1]];
    var vMeD = Math.sqrt(vMe[0] * vMe[0] +  vMe[1] * vMe[1] );
    vMe = [vMe[0] / (vMeD + 0.0005), vMe[1] / (vMeD + 0.0005)];
    var vOther = [vectorOther[1][0] - vectorOther[0][0],  vectorOther[1][1] - vectorOther[0][1]];
    var vOther  = [vOther[0] * -1, vOther[1] * -1];
    var vOTherD = Math.sqrt(vOther[0] * vOther[0] +  vOther[1] * vOther[1] );
    vOther = [vOther[0] / (vOTherD + 0.0005), vOther[1] / (vOTherD + 0.0005)];
    var a = {
      x: vOther[0],
      y: vOther[1]
    }
    var b = {
      x: vMe[0],
      y: vMe[1]
    }

    var rotationMatrix = [[a.x * b.x + a.y*b.y, b.x * a.y- a.x * b.y,],
                          [a.x * b.y - b.x * a.y, a.x * b.x + a.y * b.y]];

    var trtLamba = function (line) {
      return translateRotateTranslate(line, vectorOther, rotationMatrix, vectorMe);
    };
    other.applyLambdaToLines(trtLamba);

  }
  arrayDist(arr){
    return dist(arr[0][0], arr[0][1], arr[1][0], arr[1][1])
  }
}
/// ********** utils
// averages points in line

function linePostProcessing(line, x, y, scalingFactor){
  line = scaleLine(translateLine(line, x, y), scalingFactor)
  line = resample(line, 1.0);
  if(line.length > 7){
    return firstOrderSmoothing(line);
  }
  return line;

}

function translateRotateTranslate(l, v1, rotationMatrix, v2){
  var newLine  = translateLine(
    rotateLine(
    translateLine(l, v1[0][0], v1[1][1]), rotationMatrix), v2[0][0] * -1.0, v2[0][1] * -1.0)
  return newLine
}

// rotates point (x, y) by 2d rotation matrix rotationMatrix
function rotateLine(line, rotationMatrix){
  return line.map(p => rPwM(rotationMatrix, p[0], p[1]))
}
function rPwM(rotationMatrix, x, y){
  var a = rotationMatrix[0][0];
  var b = rotationMatrix[0][1];
  var c = rotationMatrix[1][0];
  var d = rotationMatrix[1][1];
  return [a *x + b *y, c*x + d*y];

}
function firstOrderSmoothing(arr){
  for(let i = 1; i < arr.length - 1; i++){
    arr[i][0] = (arr[i -1][0] + arr[i][0] + arr[i + 1][0]) / 3
    arr[i][1] = (arr[i -1][1] + arr[i][1] + arr[i + 1][1]) / 3
  }
  return arr
}

function get_bbox(points){
  // https://github.com/LingDong-/fishdraw
  let xmin = 9999999999999999;
  let ymin = 9999999999999999;
  let xmax = -9999999999999999;
  let ymax = -9999999999999999;
  for (let i = 0;i < points.length; i++){
    let x = points[i][0];
    let y = points[i][1];
    xmin = Math.min(xmin,x);
    ymin = Math.min(ymin,y);
    xmax = Math.max(xmax,x);
    ymax = Math.max(ymax,y);
  }
  return {x:xmin,y:ymin,w:xmax-xmin,h:ymax-ymin};
}

function resample(polyline,step){
  // https://github.com/LingDong-/fishdraw
  if (polyline.length < 2){
    return polyline.slice();
  }
  polyline = polyline.slice();
  let out = [polyline[0].slice()];
  let next = null;
  let i = 0;
  while(i < polyline.length-1){
    let a = polyline[i];
    let b = polyline[i+1];
    let dx = b[0]-a[0];
    let dy = b[1]-a[1];
    let d = Math.sqrt(dx*dx+dy*dy);
    if (d == 0){
      i++;
      continue;
    }
    let n = ~~(d/step);
    let rest = (n*step)/d;
    let rpx = a[0] * (1-rest) + b[0] * rest;
    let rpy = a[1] * (1-rest) + b[1] * rest;
    for (let j = 1; j <= n; j++){
      let t = j/n;
      let x = a[0]*(1-t) + rpx*t;
      let y = a[1]*(1-t) + rpy*t;
      let xy = [x,y];
      for (let k = 2; k < a.length; k++){
        xy.push(a[k]*(1-t) + (a[k] * (1-rest) + b[k] * rest)*t);
      }
      out.push(xy);
    }

    next = null;
    for (let j = i+2; j < polyline.length; j++){
      let b = polyline[j-1];
      let c = polyline[j];
      if (b[0] == c[0] && b[1] == c[1]){
        continue;
      }
      let t = isect_circ_line(rpx,rpy,step,b[0],b[1],c[0],c[1]);
      if (t == null){
        continue;
      }
 
      let q = [
        b[0]*(1-t)+c[0]*t,
        b[1]*(1-t)+c[1]*t,
      ];
      for (let k = 2; k < b.length; k++){
        q.push(b[k]*(1-t)+c[k]*t);
      }
      out.push(q);
      polyline[j-1] = q;
      next = j-1;
      break;
    }
    if (next == null){
      break;
    }
    i = next;

  }

  if (out.length > 1){
    let lx = out[out.length-1][0];
    let ly = out[out.length-1][1];
    let mx = polyline[polyline.length-1][0];
    let my = polyline[polyline.length-1][1];
    let d = Math.sqrt((mx-lx)**2+(my-ly)**2);
    if (d < step*0.5){
      out.pop(); 
    }
  }
  out.push(polyline[polyline.length-1].slice());
  return out;
}
// https://github.com/LingDong-/fishdraw
function isect_circ_line(cx,cy,r,x0,y0,x1,y1){
  //https://stackoverflow.com/a/1084899
  let dx = x1-x0;
  let dy = y1-y0;
  let fx = x0-cx;
  let fy = y0-cy;
  let a = dx*dx+dy*dy;
  let b = 2*(fx*dx+fy*dy);
  let c = (fx*fx+fy*fy)-r*r;
  let discriminant = b*b-4*a*c;
  if (discriminant<0){
    return null;
  }
  discriminant = Math.sqrt(discriminant);
  let t0 = (-b - discriminant)/(2*a);
  if (0 <= t0 && t0 <= 1){
    return t0;
  }
  let t = (-b + discriminant)/(2*a);
  if (t > 1 || t < 0){
    return null;
  }
  return t;
}


function polygonIntersectPolygonList(polygonTarget, polygonList){
  var intersect = false;
  for(var i = 0; i < polygonList.length; i ++ ){
    var polygon = polygonList[i];
    intersect = intersect || polygonIntersectsPolygon(polygonTarget, polygon);
  }
  return intersect;
}
function polygonIntersectsPolygon(polygon1, polygon2){
  var intersect = false;
  for(var i = 0; i < polygon1.length; i ++ ){
    var point = polygon1[i]
    intersect = intersect || pointInPolygon(point, polygon2)
  }
  return intersect
}


function scaleLine(l, scale){
  var scaled = []
  for(var j = 0; j< l.length; j++){
    var point = l[j];
    point = [point[0] * scale, point[1] * scale];
    scaled.push(point)
  }
  return scaled;
}
function translateLine(arr, x,y){
  return arr.map(p => [p[0] - x, p[1] - y])
}
function dist(x1, y1, x2, y2){
  return Math.sqrt(((y2 - y1) * (y2 - y1)) + ((x2 - x1) * (x2 - x1)))
}
//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pointInPolygon(point, vs) {
  // https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
  // https://github.com/substack/point-in-polygon
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
  
  var x = point[0], y = point[1];
  
  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i][0], yi = vs[i][1];
      var xj = vs[j][0], yj = vs[j][1];
      
      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  
  return inside;
};

function randomInteger(bottom=0, top){
  return parseInt((Math.random() * (top- bottom)) + bottom, 10);
}

function draw_svg(polylines, width, height, id){
  let o = `<svg xmlns="http://www.w3.org/2000/svg" id="` + id + `" width="` + width.toString() + `" height="`+ height.toString()+`">`
  o += `<rect x="0" y="0" width="` + width.toString() + `" height="`+ height.toString()+`" fill="floralwhite"/> <path stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round" d="`
  for (let i = 0; i < polylines.length; i++){
    o += '\nM ';
    for (let j = 0; j < polylines[i].length; j++){
      let [x,y] = polylines[i][j];
      o += `${(~~((x+10)*100)) /100} ${(~~((y+10)*100)) /100} `;
    }
  }
  o += `\n"/></svg>`
  return o;
}
function saveSVG(svgData){
  var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = "newesttree.svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


/// ********** main
// var drawingJSONs = preload();
// drawingJSONs.then(response => {
  
// });
var id = "assembler-svg"
var element = document.getElementById("assembler-svg");
function assemblerSetup(drawings){

    
    var renderStack = makeStack(drawings);
    console.log(renderStack);
    var polyLines = draw(renderStack);
    var svg = draw_svg(polyLines, width, height, id);
    element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    element.outerHTML = svg;
    element = document.getElementById("assembler-svg");
}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
}