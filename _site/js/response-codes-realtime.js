chartApp.controller('ResponseCodesRealtimeController', function ($scope, $http, $q, $interval) {
  // since we dont have data right now, we fake 
  // realtime by adding time to a date we know that 
  // is present in the logs
  var start = new Date(2012, 0, 10, 10, 0, 0, 0).getTime(); // 10. jan kl 20
  $scope.responseCodes = [];

  var queryForCode = function(gte, lte, range) {
    var from = _.first(range);
    var to = _.last(range);

    return {
      "facets": {
        "seconds": {
              "date_histogram": {
                  "field": "timestamp",
                  "interval": "1m"
              },
              "facet_filter": {
                  "and": [
                    {"range": {
                      "responsecode": {
                        "gte": gte,
                        "lte": lte
                      }
                    }}
                    ,
                    {"range": {
                      "timestamp": {
                        "gte": from,
                        "lte":  to
                      }
                    }}
                  ]
              }
          }
      }
    }
  }

  var createResultSetForResponse = function(range, response) {
    return _.map(range, function(measurePoint) {
      var object = _.findWhere(response.data.facets.seconds.entries, {time: measurePoint});
      // ES doesnt return empty facet values, so we need to pad 
      // all empty values with 0 to get a good graph
      var count = object ? object.count : 0;
      return [measurePoint, count];
    });
  }


  $scope.getData = function(steps) {
    var now = start + minutes(steps);
    // making a range in minutes
    var range = _.range(now-hours(6), now+minutes(1), minutes(1));
    
    $q.all([
      $http.post('/logs/_search', queryForCode(200, 299, range)),
      $http.post('/logs/_search', queryForCode(300, 399, range)),
      $http.post('/logs/_search', queryForCode(400, 499, range)),
      $http.post('/logs/_search', queryForCode(500, 599, range))
      ]).then(function(responses) {
        $scope.responseCodes = [
          { "key": "OK (200+)",        "values": createResultSetForResponse(range, responses[0]) },
          { "key": "REDIRECT (300+)",  "values": createResultSetForResponse(range, responses[1]) },
          { "key": "FORBIDDEN (400+)", "values": createResultSetForResponse(range, responses[2]) },
          { "key": "ERROR (500+)",     "values": createResultSetForResponse(range, responses[3]) }
        ];
      });
  }


  var timerId = $interval(function(i) {
    $scope.getData(i);
  }, 1000);
  

  // styling helpers
  $scope.xAxisFormat = function(){
      return function(d){
          return d3.time.format('%H:%M')(new Date(d));
      }
  }
  $scope.yAxisFormat = function(){
      return function(d){
          return d;
      }
  }
  $scope.colors = function() {
    return function(d, i) {
      return ['green', 'blue', 'red', 'black'][i];
    }
  }

});

// som utility time functions
function minutes(num) {
  return 60*1000*num;
}

function hours(num) {
  return minutes(60) * num;
}