PinCar = function(options) {
  this.subject = options.subject;
  this.table = options.table;

  this.leftLimit = 200;
  this.increment = parseInt(options.speed) || 1;
  this.duration = parseInt(options.duration) || 10;
  this.duration = this.duration * 1000;
  this.speed = 10;

  this.results = [];
  this.canvas = undefined;
  this.rightLimit = undefined;
  this.bugcar = undefined;
  this.testCallback = undefined;

  this.newTest = function(callback) {
    var canvasContainer = document.getElementById('container');
    while (canvasContainer.firstChild) {
      canvasContainer.removeChild(canvasContainer.firstChild);
    }
    var canvasElement = document.createElement('canvas');
    canvasElement.id = 'c';
    canvasElement.width = 800;
    canvasElement.height = 500;
    canvasContainer.appendChild(canvasElement);

    this.testCallback = callback;
    this.canvas = this.__canvas = new fabric.Canvas('c', { selection: false });
    this.rightLimit = this.canvas.width - this.leftLimit;
    var that = this;

    events = [];

    this.canvas.on({
      'touch:drag': function(event) {
        events.push({
          state: event.self.state,
              x: event.self.x,
              y: event.self.y,
        });

        if(events.length % 5 == 0) {
          var dragToRight = (events[events.length - 1].x - events[events.length - 5].x) > 0;
          if(dragToRight) {
            that.bugcar.movingLeft = false;
          } else {
            that.bugcar.movingLeft = true;
          }
        }
      },
    });

    var initialY = 200;

    fabric.Image.fromURL('images/car.png', function(img) {
      var middlePoint = (that.canvas.width / 2) - (img.width / 2);
      img.set('left', middlePoint);
      img.set('top',  initialY);
      img.movingLeft = !!Math.round(Math.random());
      img.selectable = false;

      that.canvas.add(img);
      that.bugcar = img;
    });

    var leftBorder = new fabric.Rect({
      left: 0,
      top: 0,
      fill: 'black',
      width: this.leftLimit,
      height: this.canvas.height,
      selectable: false,
    });

    var rightBorder = new fabric.Rect({
      left: this.rightLimit,
      top: 0,
      fill: 'black',
      width: this.leftLimit,
      height: this.canvas.height,
      selectable: false,
    });

    var fadingPaneWidth = this.canvas.width - (2 * this.leftLimit);
    this.fadingPane = new fabric.Rect({
      left: this.leftLimit,
      top: 0,
      fill: 'red',
      width: fadingPaneWidth,
      height: this.canvas.height,
      opacity: 0,
      selectable: false,
    });

    var lineHeight = 120;
    var lineWidth = 30;
    var lineLeft = (this.canvas.width / 2) - (lineWidth / 2);
    var lineTop = -lineHeight;
    this.yellowLineOne = new fabric.Rect({
      left: lineLeft,
      top: lineTop,
      fill: 'yellow',
      width: lineWidth,
      height: lineHeight,
      selectable: false,
    });
    this.canvas.add(this.yellowLineOne);

    this.yellowLineTwo = new fabric.Rect({
      left: lineLeft,
      top: (lineTop / 2 ) + (this.canvas.height / 2),
      fill: 'yellow',
      width: lineWidth,
      height: lineHeight,
      selectable: false,
    });
    this.canvas.add(this.yellowLineTwo);

    document.body.onkeydown = function(event) {
      if(event.keyCode == 37) { // left arrow key
        that.bugcar.movingLeft = true;
      }
      if(event.keyCode == 39) { // rigth arrow key
        that.bugcar.movingLeft = false;
      }
    };

    this.canvas.add(leftBorder);
    this.canvas.add(rightBorder);
    this.canvas.add(this.fadingPane);
    this.startedAt = new Date();

    // TODO: research a better approach: this on the setInterval function is 'undefined' or 'windows'
    var start = function() { that.render(); };
    this.rendering = setInterval(start, this.speed);

    var finish = function() { that.showResults(); };
    setTimeout(finish, this.duration);
  };

  this.animate = function() {
    // FIXME When the this.canvas.add(img) has not finished and we call animate bugcar is undefined and it throws an error
    var crashedLeftLimit  = this.leftLimit >= this.bugcar.left;
    var crashedRightLimit = this.rightLimit <= this.bugcar.left + this.bugcar.width;

    var crashed = function(that) {
      that.bugcar.movingLeft = crashedRightLimit;
      that.fadingPane.animate('opacity', 0.6, {
        duration: 250,
        onComplete: function() {
          that.fadingPane.animate('opacity', 0, { duration: 250 });
        },
      });
      var duration = Math.round((new Date() - that.startedAt) / 1000);
      that.results.push(duration);
    };

    if(crashedLeftLimit || crashedRightLimit) {
      crashed(this);
    }

    if(this.bugcar.movingLeft) {
      this.bugcar.left -= this.increment;
    } else {
      this.bugcar.left += this.increment;
    }

    var that = this;
    [this.yellowLineOne, this.yellowLineTwo].forEach(function(line) {
      if(that.canvas.height < line.top) {
        var lineHeight = 120;
        var lineTop = -lineHeight;
        line.top = lineTop
      }
      line.top += (that.increment * 2);
    });
  };

  this.render = function() {
    this.canvas.renderAll();

    // TODO: research a better approach: this on the requestAnimFrame function is 'undefined'
    var that = this;
    var process = function() { that.animate(); };
    fabric.util.requestAnimFrame(process);
  };

  this.showResults = function() {
    //FIXME: Extract the id value 'results' into a param or attribute
    var resultTable = document.getElementById('results');
    clearInterval(this.rendering);
    var duration = Math.round((new Date() - this.startedAt) / 1000);

    var resultMessage = 'Duracion: ' + duration + ' Segundos';

    var resultAsCSV = [];
    resultAsCSV.push('Choques,Tiempo(segundos)');
    this.results.forEach(function(time, index) {

      numberOfCrashed = index + 1;
      resultAsCSV.push('\n' + numberOfCrashed +  ',' + time);

      var row = document.createElement('tr');

      var attempt = document.createElement('td');
      attempt.appendChild(document.createTextNode(numberOfCrashed));
      row.appendChild(attempt);

      var timeCell = document.createElement('td');
      timeCell.appendChild(document.createTextNode(time));
      row.appendChild(timeCell);

      resultTable.appendChild(row);
    });

    file = new Blob(resultAsCSV, {type: 'text/csv'});
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(file);

    //This will only work on Chrome, FF and Opera: http://www.w3schools.com/tags/att_a_download.asp
    var filename = 'pincar';
    if(this.subject) {
      filename += '_';
      filename += this.subject;
    }
    filename += '.csv';
    a.download = filename;

    if(this.subject) {
      document.body.appendChild(a)
      a.click();
      document.body.removeChild(a)
    }
    this.testCallback();
  };

  this.getResults = function() {
    return this.results;
  };
};
