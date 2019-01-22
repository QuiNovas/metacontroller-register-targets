This is a service to be run bu the k8s [metacontroller plugin](https://github.com/GoogleCloudPlatform/metacontroller)

The controller listens for pods with the correct annotations and calls AWS API to register them into target groups.

Requires AWS credentials and region environment variables set at runtime. And a role that allows registering/deregistering targets. I use [kiam](https://github.com/uswitch/kiam) for this.

## Helm setup:

### templates/controller.yaml
```yaml
apiVersion: metacontroller.k8s.io/v1alpha1
kind: DecoratorController
metadata:
  name: log-target-data
spec:
  resources:
  - apiVersion: v1
    resource: pods
    annotationSelector:
      matchExpressions:
      - {key: logTargetInfo, operator: Exists}
  hooks:
    sync:
      webhook:
        url: http://register-targets.metacontroller.svc.cluster.local/log-info

---
apiVersion: metacontroller.k8s.io/v1alpha1
kind: DecoratorController
metadata:
  name: register-target
spec:
  resources:
  - apiVersion: v1
    resource: pods
    annotationSelector:
      matchExpressions:
      - {key: targetGroupArn, operator: Exists}
      - {key: targetPort, operator: Exists}
  hooks:
    sync:
      webhook:
        url: http://register-targets.metacontroller.svc.cluster.local/register
    finalize:
      webhook:
        url: http://register-targets.metacontroller.svc.cluster.local/deregister

---
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: register-targets
  namespace: metacontroller
spec:
  template:
    metadata:
      labels:
        app: register-targets
      annotations:
        iam.amazonaws.com/role: {{ .Values.role }}
    spec:
      containers:
      - name: hooks
        image: {{ .Values.image }}
        imagePullPolicy: Always
        env:
        - name: AWS_REGION
          value: {{ .Values.region }}
---
apiVersion: v1
kind: Service
metadata:
  name: register-targets
  namespace: metacontroller
spec:
  selector:
    app: register-targets
  ports:
  - port: 80
```

### values.yaml
```yaml
image: quinovas/metacontroller-register-targets:latest
role: kube-register-targets # The role that allows metacontroller to register the targets
region: us-east-1
```
