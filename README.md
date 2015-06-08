# World Engine

## worldEngine.addProvider(type, settings)

## worldEngine.addResource(type, name, settings)

## worldEngine.addVariable(name, settings)

## worldEngine.apply()

## worldEngine.plan()

## worldEngine.destroy()


```
var worldEngine = require('world-engine');

worldEngine.addProvider(
    "aws",
    {
        "access_key": "ACCESS_KEY_HERE",
        "secret_key": "SECRET_KEY_HERE",
        "region": "us-east-1"
    }
)

worldEngine.addResource(
    "aws_instance",
    "example",
    {
        "ami": "ami-408c7f28",
        "instance_type": "t1.micro"
    }
);

worldEngine.plan()
    .then(console.log)
    .catch(console.error);
```
