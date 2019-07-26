# aws-config-mirrorsession
Check compliance of EC2 instances for Session Mirroring

# AWS Config Rule
AWS Config makes it extremely easy to run technical state compliance against AWS resources. This rule is meant to check compliance of session mirroring sessions against individual network interfaces. It assumes that a Session Mirror Target exists.

# Custom Rule
AWS Config will execute a custom Lambda that will perform the technical state compliance. You can check the [Lambda function](index.js) or download the [packaged](./lambda-package.zip) function.

We've included a sample [policy](./Lambda-ExecutionRole-Policy.json) that should be used by the Lambda Execution Role under which the function will run.

## Compliance Results

Instances that have a network interface for which a session mirroring session exists *(NetworkInterfaceId)* are considered **COMPLIANT**:

![](https://github.com/3CORESec/aws-config-mirrorsession/blob/master/imgs/OK.png)

Instances for which no session mirroring sessions exists with their network interface *(NetworkInterfaceId)* are considered **NOT COMPLIANT**:

![](https://github.com/3CORESec/aws-config-mirrorsession/blob/master/imgs/NOK.png)

To reduce false positives we've created a third compliance state, **NOT APPLICABLE**. This is the result that is given to Amazon-owned resources. This applies, for example, to NAT Gateways, since they hold a network interface but configuration for session mirroring is not possible.

## Configuration
The following is the custom rule configuration:

![](https://github.com/3CORESec/aws-config-mirrorsession/blob/master/imgs/Rule-Execution.png)

# ToDo

* Add remediation action
* Tag-based compliance checking

# Feedback
Found this interesting? Have a question/comment/request? Let us know! 

Feel free to open an [issue](https://github.com/3CORESec/aws-config-mirrorsession/issues) or ping us on [Twitter](https://twitter.com/3CORESec).
