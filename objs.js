class Circle {
    constructor(point, ID, radius=4, fill="#0000ff", stroke="#0000c8"){
        this.fill = fill;
        this.stroke = stroke;
        this.point = point;
        this.radius = radius;
        this.id = "circle_" + ID.toString();
        this.elements = {};
    }
    addToParentElement(parent){
        if(parent.id in this.elements){
            return;
        }
        var newCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        newCircle.setAttribute("fill", this.fill);
        newCircle.setAttribute("stroke", this.stroke);
        newCircle.setAttribute("cy", this.point.y);
        newCircle.setAttribute("cx", this.point.x);
        newCircle.setAttribute("r", this.radius);
        newCircle.setAttribute("stroke-width", this.radius / 2);
        newCircle.setAttribute("class", "circle");
        newCircle.setAttribute("id", this.id);
        newCircle.classList.add(this.id);
     
        parent.appendChild(newCircle);
        this.elements[parent.id] = newCircle;
        this.reRender();
    }
    moveByVector(vec){
        this.point = {
                x: this.point.x + vec.x, 
                y: this.point.y + vec.y,
        }
    }
    reRender(){
        Object.entries(this.elements).forEach(([_, circle]) => {
            circle.setAttribute("cy", this.point.y);
            circle.setAttribute("cx", this.point.x);
        })
        
    }
    destroy(){
        Object.entries(this.elements).forEach(([_, element]) => element.outerHTML = "");
        this.elements = {};
    }
    destroyParent(parentName){
        if(parentName in this.elements){
            this.elements[parentName].outerHTML = "";
            delete this.elements[parentName]
        }
    }
}
class TextSVG {
    constructor(point, ID, txt, fill="#0000ff", text_anchor="start") {
        this.fill = fill;
        this.point = point;
        this.id = ID;
        this.elements = [];
        this.txt = txt;
        this.text_anchor = text_anchor;
    }
    reflectOverX(){
        this.point = {x: this.point.x, y: this.point.y * -1};
    }
    reflectOverY(){
        this.point = {x: this.point.x * -1, y: this.point.y};
    }
    addToParentElement(parent){
        if(parent.id in this.elements){
            return;
        }
        var newText =  document.createElementNS('http://www.w3.org/2000/svg', 'text');
        newText.setAttribute("fill", this.fill);
        newText.setAttribute("y", this.point.y);
        newText.setAttribute("x", this.point.x);
        newText.setAttribute("id", this.id);
        newText.setAttribute("text-anchor", this.text_anchor);
        newText.textContent  = this.txt;
        newText.classList.add(this.id);
     
        parent.appendChild(newText);
        this.elements[parent.id] = newText;
        this.reRender();

    }
    moveByVector(vec){
        this.point = {
                x: this.point.x + vec.x, 
                y: this.point.y + vec.y,
        }
    }
    reRender(){
        Object.entries(this.elements).forEach(([parentName, element]) => {
            element.setAttribute("y", this.point.y);
            element.setAttribute("x", this.point.x);
            element.textContent  = this.txt;
         
        });
       
    }
    fromJSON(json){
        this.fill = json.fill;
        this.point =json.point;
        this.id = json.id;
        this.txt = json.txt;
        this.text_anchor = json.text_anchor;
    }
    destroy(){
        Object.entries(this.elements).forEach(([_, element]) => element.outerHTML = "");
        this.elements = {};
    }
    destroyParent(parentName){
        if(parentName in this.elements){
            this.elements[parentName].outerHTML = "";
            delete this.elements[parentName]
        }
    }
}

class Line {
    constructor(ID, lineClosed=false, stroke="#000", fill="none", width=2) {
        this.fill = fill;
        this.strokeWidth = width;
        this.stroke = stroke;
        this.points = [];
        this.elements = {};
        this.id = "stroke_" + ID.toString();

        this.lineClosed = lineClosed;
        this.closePoint = null;
      
    }
    reflectOverX(){
        this.points = this.points.map(point => {
            return {x: point.x, y: point.y * -1};
        });
    }
    reflectOverY(){
        this.points = this.points.map(point => {
            return {x: point.x * -1 , y: point.y};
        });

    }
    addToParentElement(parent){
        if(parent.id in this.elements){
            return;
        }
        var newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        newPath.setAttribute("fill", this.fill);
        newPath.setAttribute("stroke", this.stroke);
        newPath.setAttribute("stroke-width",this.strokeWidth);
        newPath.classList.add(this.id);
     
        parent.appendChild(newPath);
        this.elements[parent.id] = newPath;
        this.reRender();

    }
    jsonToObj(json){
        this.fill = json.fill;
        this.strokeWidth = json.strokeWidth;
        this.stroke = json.stroke;
        this.points = json.points;
        this.id = json.id;
        this.elements = {};
        this.lineClosed = json.lineClosed;
        this.closePoint = json.lineClosed && this.points.length > 0 ? this.points[0] : null;
       
    }
    movePoint(index, vec){
        var point = this.points[index];
        point =  {
            x: point.x + vec.x, 
            y: point.y + vec.y,
        }
        this.points[index] = point;
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
    }
    removePoint(index=null){
        if(index == null){
            this.points.pop();
        } else if(this.points.length > 0 && index >= 0 && index < this.points.length){
            this.points.pop(index);
        } 
        if(this.points.length == 0){
            this.closePoint = null;
        }
        return;
    }
    insertPoint(index, point){
        var trunced = {
            x: Math.trunc(point.x),
            y: Math.trunc(point.y),
        }
        
        this.points.splice(index, 0, trunced);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

    }
    appendPoint(point){
        var trunced = {
            x: Math.trunc(point.x),
            y: Math.trunc(point.y),
        }
        this.points.push(trunced);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
        this.reRender();
    }
    pointInRect(point){
        var lineRect = get_bbox(this.points);
        if((lineRect[0].x <= point.x && point.x <=lineRect[1].x ) && (lineRect[0].y <= point.y && point.y <= lineRect[1].y)){
            return true;
        }
        return false;

    }
    inRect(rect){
        
        for(var i = 0; i < this.points.length; i++){
            var point = this.points[i];

            if(rect[0].x <= point.x && point.x <= rect[1].x && rect[0].y <= point.y && point.y <= rect[1].y){
      
                return true;
            }
            if(i + 1 < this.points.length){
                var point2 = this.points[i + 1];
                var rectbottomleft = {x: rect[0].x, y: rect[1].y};
                var recttopright = {x: rect[1].x, y: rect[0].y };

                if(doIntersect(point, point2, rect[0], rectbottomleft)){
                    return true;
                } else if(doIntersect(point, point2, rectbottomleft, rect[1])){
                    return true;
                } else if(doIntersect(point, point2, rect[1], recttopright)){
                    return true;
                } else if(doIntersect(point, point2, recttopright, rect[0])){
                    return true;
                }
            }
        }
        return false;
    }
    reRender(){
        Object.entries(this.elements).forEach(([parentName, path]) => {
            path.setAttribute("d",  this.toString());
         
        });
 
        
    }
    destroy(){
        Object.entries(this.elements).forEach(([_, element]) => element.outerHTML = "");
        this.elements = {};
    }
    destroyParent(parentName){
        if(parentName in this.elements){
            this.elements[parentName].outerHTML = "";
            delete this.elements[parentName]
        }
    }
    moveByVector(vec){
        this.points = this.points.map(point => {
            return {
                x: Math.trunc(point.x + vec.x), 
                y: Math.trunc(point.y + vec.y),
            };
        })
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
    }
 
    toString(){
        var svgString = this.points.reduce(function(str, point){
            str += " L" + point.x + " " + point.y;
            return str;
        }, "");
        svgString = "M" + svgString.slice(2);

        if(this.lineClosed && this.points.length > 0){
            svgString += " L" + this.closePoint.x + " " + this.closePoint.y;
        }
        return svgString;
    }
    removeCSS(CSSClass){
        Object.entries(this.elements).forEach(([_, path]) =>  path.classList.remove(CSSClass));
    }
    addCSS(CSSClass){
        Object.entries(this.elements).forEach(([_, path]) => path.classList.add(CSSClass));
    }
}

if (typeof(module) !== "undefined") {
	module.exports.Line = Line;
    module.exports.Circle = Circle;
    module.exports.TextSVG = TextSVG; // Text is an inbuilt
}
