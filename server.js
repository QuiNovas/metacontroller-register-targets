var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
var AWS = require('aws-sdk');
var elb = new AWS.ELBv2();
var port = (process.env.PORT || process.env.VCAP_APP_PORT || 80);

app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/log-info', function(req, res) {
  console.log(JSON.stringify(req.body));
  res.status(200);
});

app.post('/register', function(req, res){

  var targetGroupArn = req.body.object.metadata.annotations.targetGroupArn;
  var targetIp = req.body.object.status.podIP;
  var targetPort = req.body.object.metadata.annotations.targetPort;

  if(!targetIp || targetIp == undefined || targetIp == null){
    res.status(400).json({ error: 'podIp not ready.' });
    return
  }

  var params = {
    TargetGroupArn: targetGroupArn,
    Targets: [
      {
        Id: targetIp,
        Port: targetPort
      },
    ]
  }

  elb.registerTargets(params, function(err, data) {
    if(err){
      if(err.code == "TargetGroupNotFound" || err.message.includes('target type is instance')){
        console.log(err.message);
        res.status(200).json({msg: err.message, finalized: false});
        console.log(err, err.stack);
      }else{
        res.status(500).json({ error: err, msg: 'Failed to register target.'});
      }
    }else{
      console.log(data);
      console.log("Registered target: " + targetIp + ":" + targetPort + "to " + targetGroupArn);
      res.status(200).json({response: "Registered target: " + targetIp + ":" + targetPort + " to " + targetGroupArn});
    }
  });
});

app.post('/deregister', function(req, res){
  var targetGroupArn = req.body.object.metadata.annotations.targetGroupArn;
  var targetIp = req.body.object.status.podIP;
  var targetPort = req.body.object.metadata.annotations.targetPort;

  if(!targetIp || targetIp == undefined || targetIp == null){
    res.status(200).json({ finalized: true, msg: 'podIp not supplied. Assuming pod was never ready and removing.' });
    return
  }

  var params = {
    TargetGroupArn: targetGroupArn,
    Targets: [
        {
        Id: targetIp,
        AvailabilityZone: 'all',
        Port: targetPort
      },
    ]
  }

  elb.deregisterTargets(params, function(err, data) {
    if(err){
      if(err.code == "TargetGroupNotFound" || err.message.includes('target type is instance')){
        console.log(err.message);
        res.status(200).json({msg: err.message, finalized: true});
      }else{
        res.status(500).json({error: err, msg: 'Failed to deregister target.', finalized: false });
      }
    }else{
      console.log(data)
      console.log("Deregistered target: " + targetIp + ":" + targetPort + " from " + targetGroupArn)
      res.status(200).json({response: "Degistered target: " + targetIp + ":" + targetPort + "to " + targetGroupArn, finalized: true});
    }
  });
});

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});

