var aws = require('aws-sdk');
var config = new aws.ConfigService();
var ec2 = new aws.EC2();
const MAX_RESULTS = '1000';
const amazon_owner_id = 'amazon-aws';

function checkDefined(reference, referenceName) {
    if (!reference) {
        console.log("Error: " + referenceName + " is not defined");
        throw referenceName;
    }
    return reference;
}

exports.handler = function (event, context) {
    console.log(JSON.stringify(event, null, 2));
    var event = checkDefined(event, "event");
    var invokingEvent = JSON.parse(event.invokingEvent);
    var configurationItem = checkDefined(invokingEvent.configurationItem, "invokingEvent.configurationItem");
    var putEvaluationsRequest = {};
    return getInstanceNetworkId(function (netData) {
        if (netData == null){
            putEvaluationsRequest.Evaluations = [
                {
                    ComplianceResourceType: configurationItem.resourceType,
                    ComplianceResourceId: configurationItem.resourceId,
                    ComplianceType: 'NOT_APPLICABLE',
                    OrderingTimestamp: configurationItem.configurationItemCaptureTime,
                },
            ];
            return config.putEvaluations(putEvaluationsRequest, function (err, data) {
                if (err)
                    context.fail(err);
                else
                    context.succeed(data);
            });
        }
        else
            return getSessionNetworkIds(function (mirrData) {
                var ret = 'NON_COMPLIANT';
                var allAccounted = netData.every(v => mirrData.includes(v));
                if (allAccounted || mirrData.length == 0)
                    ret = 'COMPLIANT';
                putEvaluationsRequest.Evaluations = [
                    {
                        ComplianceResourceType: configurationItem.resourceType,
                        ComplianceResourceId: configurationItem.resourceId,
                        ComplianceType: ret,
                        OrderingTimestamp: configurationItem.configurationItemCaptureTime,
                    },
                ];
                putEvaluationsRequest.ResultToken = event.resultToken;
                return config.putEvaluations(putEvaluationsRequest, function (err, data) {
                    if (err)
                        context.fail(err); 
                    else
                        context.succeed(data);
                });
            })
    }, configurationItem.resourceId);
};

function flat(arr) {
    let i = 0
    while (i < arr.length) {
        if (Array.isArray(arr[i])) {
            arr.splice(i, 1, ...arr[i])
        } else {
            i++
        }
    }
    return arr
}

function getInstanceNetworkId(cb, id) {
    var params = {
        DryRun: false,
        InstanceIds: [id]
    };
    var selector = data => {
        if (data.Reservations[0].OwnerId == amazon_owner_id)
            return null;
        else
            return flat(
                data
                    .Reservations.map(res =>
                        res.Instances.map(inst =>
                            inst.NetworkInterfaces.map(ni => ni.NetworkInterfaceId)
                        )
                    )
            )
    };
    return repeatEc2RequestUntilNullNextToken(ec2.describeInstances, cb, params, selector, '');
}

function getSessionNetworkIds(cb) {
    var params = {
        DryRun: false,
        MaxResults: MAX_RESULTS
    };
    var selector = data => data.TrafficMirrorSessions.map(x => x.NetworkInterfaceId);
    return repeatEc2RequestUntilNullNextToken(ec2.describeTrafficMirrorSessions, cb, params, selector, '');
}

function repeatEc2RequestUntilNullNextToken(requestCall, callback, params, selector, nextToken, results = []) {
    if (typeof nextToken != 'undefined') {
        if (nextToken != '')
            params.NextToken = nextToken;
        return requestCall.bind(ec2)(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                console.log(JSON.stringify(data, null, 2));
                var filtered_res = selector(data);
                if (filtered_res == null) return callback();
                results = results.concat(selector(data));
                return repeatEc2RequestUntilNullNextToken(requestCall, callback, params, selector, data.NextToken, results);
            }
        });
    }
    else
        return callback(results);
}
