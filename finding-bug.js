FindingBug = function(options) {
  "use strict";
  this.results = [];
  this.subject = options.subject;
  this.quantity = parseInt(options.quantity) || 5
  this.increment = parseInt(options.speed) || 1;

  this.newTest = function(callback, poc) {
    this.callback = callback;
    // configuration options
    var speed = 10; //miliseconds

    var finished = false;
    var resultShowed = false;
    var that = this;

    var canvasContainer = document.getElementById('container');
    while (canvasContainer.firstChild) {
      canvasContainer.removeChild(canvasContainer.firstChild);
    }

    var canvasElement = document.createElement('canvas');
    canvasElement.id = 'c';
    canvasElement.width = 800;
    canvasElement.height = 500;
    canvasContainer.appendChild(canvasElement);

    var canvas = this.__canvas = new fabric.Canvas('c', { selection: false });
    var targetObject = null;
    var that = this;

    var insideBoundaries = function(limit, objectPosition, objectSize, delta) {
      var upperLimit = objectPosition + delta < limit - objectSize;
      var lowerLimit = objectPosition + delta > 0;
      return upperLimit && lowerLimit;
    };

    var lastPositionX = undefined;
    var lastPositionY = undefined;
    var mouseHandler = function(params) {
      var currentPositionX = params.e.x;
      var currentPositionY = params.e.y;

      targetObject.enabled = false;

      if(lastPositionX && lastPositionY) {
        targetObject.movingLeft = lastPositionX > currentPositionX;

        var deltaX = currentPositionX - lastPositionX;
        var insideXlimits = insideBoundaries(canvas.width, targetObject.left, targetObject.width, deltaX);

        if(insideXlimits) targetObject.left += deltaX;

        targetObject.movingDown = lastPositionY > currentPositionY;

        var deltaY = currentPositionY - lastPositionY;
        var insideYlimits = insideBoundaries(canvas.height, targetObject.top, targetObject.height, deltaY);

        if(insideYlimits) targetObject.top += deltaY;

        //FIXME render just the targetObject under the mouse influnce
        canvas.renderAll();
        targetObject.enabled = true;
      }

      lastPositionX = currentPositionX;
      lastPositionY = currentPositionY;
    };

    var selectedObject = undefined;
    var ended = false;
    var hasShownCorrectResult = false;
    canvas.on('mouse:move', mouseHandler);
    document.onkeypress = function(event) {
      var subjectSelection = undefined;

      if(event.keyCode == 32) { // Space key
        if(!finished) { // Space key
          clearInterval(rendering);
          canvas.off('mouse:move');
          finished = true;
          finishedAt = new Date();

          canvas.getObjects().forEach(function(object) {
            object.selectable = true;
            object.setCoords();
          });

          canvas.on('object:selected', function(event) {
            selectedObject = event.target;
            if(subjectSelection) {
              canvas.remove(subjectSelection);
            }

            fabric.Image.fromURL('images/ladybug_selected.png', function(img) {
              img.set('left', selectedObject.left);
              img.set('top',  selectedObject.top);
              canvas.add(img);
              subjectSelection = img;
            });
            resultShowed = true;
          });
        } else if(selectedObject){
          var failed = selectedObject !== targetObject;

          if(!ended) {
            if(!failed || hasShownCorrectResult) { // Space key
              showTargetObject();
              ended = true;
            }

            if(failed) { // Space key
              fabric.Image.fromURL('images/ladybug_to_be_found.png', function(img) {
                img.set('left', targetObject.left);
                img.set('top',  targetObject.top);
                canvas.add(img);
              });
              hasShownCorrectResult = true;
            }
          }
        }
      }
    };

    for(var i = 0; i < this.quantity; i++) {
      fabric.Image.fromURL('images/ladybug.png', function(img) {
        img.set('left', fabric.util.getRandomInt(0, canvas.width - img.width));

        img.set('top',  fabric.util.getRandomInt(0, canvas.height - img.height));
        img.movingLeft = !!Math.round(Math.random());
        img.movingDown = !!Math.round(Math.random());
        img.selectable = false;
        img.enabled = true;
        canvas.add(img);
        if(canvas._objects.length == 1) targetObject = img;
      });
    }

    var moveOnX = function(obj) {
      if (obj.left > canvas.width - obj.width) {
        obj.movingLeft = false;
      }
      if (obj.left <= 0) {
        obj.movingLeft = true;
      }
      if(obj.movingLeft) {
        obj.left += that.increment;
      } else {
        obj.left -= that.increment;
      }
    };

    var moveOnY = function(obj) {
      if (obj.top > canvas.height - obj.height) {
        obj.movingDown = false;
      }
      if (obj.top <= 0) {
        obj.movingDown = true;
      }
      if(obj.movingDown) {
        obj.top += that.increment;
      } else {
        obj.top -= that.increment;
      }
    };

    var animate = function() {
      canvas.forEachObject(function(obj) {
        if(obj.enabled) {
          moveOnX(obj);
          moveOnY(obj);
        }
      });
    };

    var render = function() {
      canvas.renderAll();
      fabric.util.requestAnimFrame(animate);
    };

    var finishedAt = null;
    var startedAt = new Date();
    var rendering = setInterval(render, speed);

    var showTargetObject = function() {
      var duration = Math.round((finishedAt - startedAt) / 1000);
      that.timeLastTest = duration;

      if(selectedObject === targetObject) {
        //TODO: this should go inside the mark as method
        if(!poc) {
          markAsSuccess();
        }
        that.callback('success');
      } else {
        if(!poc) {
          markAsFailure();
        }
        that.callback('failure');
      }
    };

    var markAsSuccess = function() {
      that.results.push({ time: that.timeLastTest, result: 'succeeded' });
    };

    var markAsFailure = function() {
      that.results.push({ time: that.timeLastTest, result: 'failed' });
    };
  };

  this.getResults = function() {
    return this.results;
  };

  this.eraseLastResult = function() {
    this.results.pop();
  };

  this.showResults = function(tableId) {
    var resultTable = document.getElementById(tableId);
    var numberOfSucceded = 0;
    var resultsAsCVS = [];
    resultsAsCVS.push('Intento,Tiempo,Resultado')
    this.results.forEach(function(result, index) {
      var attemptNumber = index + 1;

      var resultClass = 'danger';
      var resultValue = 'Fallo';
      if(result.result === 'succeeded') {
        resultClass = 'success';
        resultValue = 'Acierto';
        numberOfSucceded += 1;
      }

      resultsAsCVS.push('\n' + attemptNumber + ',' + result.time + ',' + resultValue);

      var row = document.createElement('tr');

      var attempt = document.createElement('td');
      attempt.appendChild(document.createTextNode(attemptNumber));
      row.appendChild(attempt);

      var time = document.createElement('td');
      time.appendChild(document.createTextNode(result.time));
      row.appendChild(time);

      var testResult = document.createElement('td');
      testResult.appendChild(document.createTextNode(resultValue));

      row.className = resultClass;
      row.appendChild(testResult);

      resultTable.appendChild(row);
    });

    var file = new Blob(resultsAsCVS, {type: 'text/csv'});
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(file);

    //This will only work on Chrome, FF and Opera: http://www.w3schools.com/tags/att_a_download.asp
    var filename = 'finding-bug';
    if(this.subject) {
      filename += '_';
      filename += this.subject;
      filename += '.csv';
      a.download = filename;

      document.body.appendChild(a)
      a.click();
      document.body.removeChild(a)
    }

    return numberOfSucceded;
  };
};

