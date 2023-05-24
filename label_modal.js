
class Labels{
  constructor(assignlabels, nodes = [], links = []){
    this.modalID = "enter-label";
    this.labelDisplayDivID = "label-display";
    this.graphDisplayDivID = "graph-display";
    this.labelErrorDisplayPID = "error-add-label";
    this.moveLabelButtonID = "move-label";
    this.editLabelButtonID = "edit-label";
    this.deleteLabelButtonID = "delete-labels";
    this.biDirectionalLinkButtonID = "bi-link-assign";
    this.leftDirectionalLinkButtonID = "left-link-assign";
    this.rightDirectionalLinkButtonID = "right-link-assign";
    this.svgHeight = "error-add-label";
    this.selectedCSS = "selected-element" 
    this.width = 1500;
    this.height = 600;
    this.circle_radius = 40;
    this.colors =  d3.scale.category10();
    document.getElementById(this.graphDisplayDivID).innerHTML = "";

    this.graphSvg = d3.select("#" + this.graphDisplayDivID)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('id', 'graph');
    this.graphSvg.append('svg:defs').append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('markerWidth',6)
      .attr('markerHeight',6)
      .attr('orient', 'auto')
      .attr('class', 'marker-end')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');
    this.graphSvg.append('svg:defs').append('svg:marker')
      .attr('id', 'start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 4)
      .attr('markerWidth',6)
      .attr('markerHeight',6)
      .attr('class', 'marker-end')
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M10,-5L0,0L10,5');


    this.nodes = nodes;
    this.links = links;

    // line displayed when dragging new nodes
    this.drag_line = this.graphSvg.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    this.path = this.graphSvg.append('svg:g').selectAll('path');
    this.circle = this.graphSvg.append('svg:g').selectAll('g');

    

    // mouse event this.
    this.selected_node = null;
    this.selected_link = null;
    this.mousedown_link = null;
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.isKeyPressed = false;
    this.canDrag = false;
    this.force = d3.layout.force()
    .nodes(this.nodes)
    .links(this.links)
    .size([this.width, this.height])
    .linkDistance(300)
    .charge(-500)
    .on('tick', () =>  this.tick(this.path))
    this.graphSvg.on('mousedown', (e) => this.mousedown(e))
    .on('mousemove',() => this.mousemove())
    .on('mouseup', () => this.mouseup())
   
    this.force.drag().on('dragstart', (d) => {d.fixed=true});


    document.getElementById(this.moveLabelButtonID).onclick = () => this.moveMode();
    document.getElementById(this.editLabelButtonID).onclick = () => this.editMode();
    document.getElementById(this.deleteLabelButtonID).onclick = () => this.deleteNode();
    document.getElementById(this.biDirectionalLinkButtonID).onclick = () => this.biDirectionalLink();
    document.getElementById(this.leftDirectionalLinkButtonID).onclick = () => this.leftDirectionLink();
    document.getElementById(this.rightDirectionalLinkButtonID).onclick = () => this.rightDirectionLink();
    this.editMode();
    

    this.assignlabels = assignlabels;
    this.restart();
    this.assignlabels.render(this.nodes);

  }
  

  moveMode(){
    this.canDrag = true;
    document.getElementById(this.moveLabelButtonID).classList.add(this.selectedCSS);
    document.getElementById(this.editLabelButtonID).classList.remove(this.selectedCSS);
    this.resetMouseVars();this.svgHeight
    this.circle.call(this.force.drag);
    this.graphSvg.classed('ctrl', true);
  }

  editMode(){
    this.canDrag = false;
    document.getElementById(this.editLabelButtonID).classList.add(this.selectedCSS);
    document.getElementById(this.moveLabelButtonID).classList.remove(this.selectedCSS);
    this.graphSvg.classed('ctrl', false);
    this.circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
  }
  export(){
    const edgeDict = {};
    edgeDict[""] = [""];
    this.nodes.forEach(node => {
      edgeDict[""].push(node.id);
      edgeDict[node.id] = [];
      if(/reflexive/.test(node.id)){
        edgeDict[node.id].push(node.id);
      }
    })
    this.links.forEach(link => {
      if(link.right){
        edgeDict[link.source.id].push(link.target.id);
      } if(link.left){
        edgeDict[link.target.id].push(link.source.id);
      }
    });
    return edgeDict;
  }
  showError(error){
    document.getElementById(this.labelErrorDisplayPID).innerHTML = error;
  }

  hideError(){
    document.getElementById(this.labelErrorDisplayPID).innerHTML  = "";    
  }

  addLabel(uncleanedLabel){
    this.hideError();
    var label = uncleanedLabel.replace(/[^a-z0-9]/gi, '');
    if(label == ""){
      this.showError("label cannot be empty string");
      return [false, "label cannot be empty string"];
    }
    var inNodes = this.nodes.some(node => node.id == label);
    if(inNodes){
      this.showError("cannot add a label that already exists");
      return [false, "cannot add a label that already exists"];
    } 

    const rect = (this.graphSvg.node()).getBoundingClientRect();
    const x = Math.trunc((rect.right - rect.left) / 2);
    const y =  Math.trunc((rect.bottom - rect.top) / 2);
    var newNode = {
      id: label,
      x: x,
      y: y,
    }
    this.nodes.push(newNode);
    this.render();
    this.assignlabels.render(this.nodes);
    return [true, null];
  }

  render(){
    var labelDisplayDiv = document.getElementById(this.labelDisplayDivID)
    labelDisplayDiv.innerHTML = "";
  
    const rect = document.getElementById(this.labelDisplayDivID).getBoundingClientRect();
    const x = Math.trunc((rect.right - rect.left) / 2);
    const y =  Math.trunc((rect.bottom - rect.top) / 2);

    this.resetMouseVars();
    this.restart();
   
  }
  mount(){
    
    document.getElementById(this.modalID).style.display = "block";
    const rect = document.getElementById(this.svgHeight).getBoundingClientRect();
    this.width = Math.trunc(rect.right - rect.left);
    this.force.size([this.width, this.height]);
    this.graphSvg
      .attr('width', this.width);
    this.restart();
  }
  unmount(){
    document.getElementById(this.modalID).style.display = "none";
    document.getElementById(this.labelDisplayDivID).innerHTML = ""
  }
 
  mousedown() {
    // prevent I-bar on drag
    // because :active only works in WebKit?

    if(this.canDrag) return;

    this.graphSvg.classed('active', true);
  
    if(this.mousedown_node || this.mousedown_link) return;
  
    this.restart();
  }
  destroy(){
    d3.select('#graph').remove();
  }
  mousemove() {
    if(this.canDrag) return;

    if(!this.mousedown_node) return;

    this.drag_line.attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + ' L' + d3.mouse(this.graphSvg.node())[0] + ',' + d3.mouse(this.graphSvg.node())[1]);
  
    this.restart();
  }
  mouseup() {
    if(this.mousedown_node) {
      // hide drag line
      this.drag_line
        .classed('hidden', true)
    }
  
    // because :active only works in WebKit?
    this.graphSvg.classed('active', false);
  
    // clear mouse event vars
    this.resetMouseVars();
  }
  resetMouseVars() {
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.mousedown_link = null;
  }
  tick() {
    // draw directed edges with proper padding from node centers

    this.path.attr('d', (d) => {

      var deltaX = d.target.x - d.source.x,
          deltaY = d.target.y - d.source.y,
          dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          normX = deltaX / dist,
          normY = deltaY / dist,
          sourcePadding = this.circle_radius,
          targetPadding = this.circle_radius,
          sourceX = d.source.x + (sourcePadding * normX),
          sourceY = d.source.y + (sourcePadding * normY),
          targetX = d.target.x - (targetPadding * normX),
          targetY = d.target.y - (targetPadding * normY);
     
      return 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY;
    });
    
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  }
  circleMouseUp(d){
    
    if(!this.mousedown_node) return;

    // needed by FF
    this.drag_line
      .classed('hidden', true);

  
    this.mouseup_node = d;
    if(this.mouseup_node === this.mousedown_node) { this.resetMouseVars(); return; }

    // unenlarge target node
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    // add link to graph (update if exists)
    var mousedown_node = this.mousedown_node;
    var mouseup_node = this.mouseup_node;


    var link = this.links.filter(function(l) {
      return ((l.source === mousedown_node && l.target === mouseup_node) || (l.source === mouseup_node && l.target === mousedown_node));
    })[0];
  
    if(!link) {
      link = {source: this.mousedown_node, target: this.mouseup_node, left: false, right: true};
      this.links.push(link);
    }

    // select new link
    this.selected_link = link;
    this.selected_node = null;
    this.restart();
    

  }
  pathMouseDown(d){
    this.mousedown_link = d;
    if(this.mousedown_link === this.selected_link) this.selected_link = null;
    else this.selected_link = this.mousedown_link;
    this.selected_node = null;
    this.restart();

  }
  spliceLinksForNode(node) {
    this.links = this.links.filter(function(l) {
      return !(l.source === node || l.target === node);
    });
  }

  deleteNode(){
   
    if(!this.selected_node && !this.selected_link) return;
    if(this.selected_node) {
      this.nodes.splice(this.nodes.indexOf(this.selected_node), 1);
      thumbnailsobj.removeLabel(this.selected_node.id);
      this.spliceLinksForNode(this.selected_node);
    } else if(this.selected_link) {
      this.links.splice(this.links.indexOf(this.selected_link), 1);
    }
    this.selected_link = null;
    this.selected_node = null;

    this.restart();
    this.assignlabels.render(this.nodes);

  }
  biDirectionalLink(){
    if(this.selected_link) {
      // set link direction to both left and right
      this.selected_link.left = true;
      this.selected_link.right = true;
    }
    this.restart();
  }

  leftDirectionLink(){
  
    if(this.selected_link) {
      // set link direction to left only
      this.selected_link.left = true;
      this.selected_link.right = false;
    }
    this.restart();
  }
  rightDirectionLink(){
    if(this.selected_link) {
      // set link direction to right only
      this.selected_link.left = false;
      this.selected_link.right = true;
    }
    this.restart();
  }

  
  circleMouseDown(d){
    // select node
    this.mousedown_node = d;
    if(this.mousedown_node === this.selected_node) this.selected_node = null;
    else this.selected_node = this.mousedown_node;
    this.selected_link = null;

    // reposition drag line
  
    this.drag_line
      .classed('hidden', false)
      .attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + 'L' + this.mousedown_node.x + ',' + this.mousedown_node.y);

    this.restart();
  }
  restart() {
    
  
    this.path = this.path.data(this.links);
  
    // update existing links
  
    this.path.classed('selected', (d) =>  { return d === this.selected_link; })
      .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
      .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
  
  
    // add new links
    this.path.enter().append('svg:path')
      .attr('class', 'link')
      .classed('selected', (d) => { return d === this.selected_link; })
      .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
      .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
      .on('mousedown', (d) => this.pathMouseDown(d));
 
  
    // remove old links
    this.path.exit().remove();
  
  
    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    this.circle = this.circle.data(this.nodes, function(d) { return d.id; });
  
    // update existing nodes (reflexive & selected visual states)
    var selected_node = this.selected_node;
    this.circle.selectAll('circle')
      .classed('selected', function (d) { return (d === selected_node)})
  
    // add new nodes
    var g = this.circle.enter().append('svg:g');
    g.append('svg:circle')
      .attr('class', 'node')
      .attr('r', this.circle_radius)
      .on('mousedown', (d) => this.circleMouseDown(d))
      .on('mouseup', (d) => this.circleMouseUp(d));
  
    // show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('class', 'id')
        .attr('alignment-baseline', 'middle')
        .text(function(d) { return d.id; });
  
    // remove old nodes
    this.circle.exit().remove();
  
    // set the graph in motion
   this.force.start();
  }
}


class AssignLabel{
  constructor(){
    this.nodes = {};
  }
  render(nodes){
    this.nodes = {};
    var dropDownDiv =  document.getElementById("label-dropdown");
    dropDownDiv.innerHTML = "";
    nodes.forEach(node => {
      var text = document.createElement('p');
      text.innerHTML = node.id;
      text.onclick = () => {
        orientlinemode.assignLabel(select.selected, node.id)
      };
      dropDownDiv.appendChild(text);
      this.nodes[node.id] = text;
    });
  }
  toggleDropDown(){
    document.getElementById("label-dropdown").classList.toggle("show");
  }
  closeDropdown(){
    if (document.getElementById("label-dropdown").classList.contains('show')) {
      document.getElementById("label-dropdown").classList.remove('show');
    }
  }
}


var assignlabels = new AssignLabel();
var labelmanager = new Labels(assignlabels);


function toggleDropdown(){
  assignlabels.toggleDropDown()

}
function addLabel(){
  var label = document.getElementById("label-text-input");
  const [reset, _] = labelmanager.addLabel(label.value);
  if(reset){
    label.value = "";
  }
}

function labelManagerFromJSON(edgeDict){
  var links = [];
  var nodes = [];
  Object.keys(edgeDict).forEach((id) => nodes.push({id: id}));
  nodes = nodes.filter(label => label.id != "");
  Object.entries(edgeDict).forEach(([node1, list]) => {
    if(node1 != ""){
      list.forEach(node2 => {
        if(node2 != node1){
          var link = links.some(function(l) {
            return ((l.source.id === node1 && l.target.id === node2) || (l.source.id === node2 && l.target.id === node1));
          });
          var node1index = -1 
          var node2index = -1
          nodes.indexOf({id: node2})
          for(var i = 0;i < nodes.length; i ++){
            if(nodes[i].id == node2){
              node2index = i;
            }
            if(nodes[i].id == node1){
              node1index = i;

            }
          }
     
          if(!link) {
            link = {source: node1index, target: node2index, right: true, left: false};
            links.push(link);
          }
        }
      });
    }
  });

  assignlabels = null;
  assignlabels = new AssignLabel();
  labelmanager = new Labels(assignlabels, nodes, links);
  labelmanager.restart();
  labelmanager.assignlabels.render(labelmanager.nodes);

}

// When the user clicks the button, open the modal 
document.getElementById("add-label").onclick =function(){
  labelmanager.mount();

}

function toggleInstructionsDropdown(){
  document.getElementById("instructions-dropdown").classList.toggle("show");
}

// When the user clicks on <span> (x), close the modal
document.getElementById("modal-text-close").onclick = function() {
  labelmanager.unmount();
}
// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == document.getElementById("enter-label")) {
    labelmanager.unmount();
  }
}

window.onclick = function(event) {  
  if(!event.target.matches('#assign-label')){
    assignlabels.closeDropdown()
  }
  if(!event.target.matches('#instructions')){
    if (document.getElementById("instructions-dropdown").classList.contains('show')) {
        document.getElementById("instructions-dropdown").classList.remove('show');
    }
  }
}