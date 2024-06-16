const net=require('net');
const events=require('events');

class Request
{
    constructor()
    {
        this.action='';
        this.success=false;
        this.userName='';
        this.password='';
        this.userId='';
    }
}

class DataModel{
    constructor()
    {
        this.userName='';
        this.userId=null;
    }
}

var model=new DataModel();
var eventEmitter=new events.EventEmitter();

//event
function loggedOut()
{
    console.log(`User ${model.userName} logged out `);
    process.exit(0);
}

function userListArrived(response)
{
    let users=response.result;
    console.log('List of online users =>');
    users.forEach(function(user){
        console.log(user);
    })
}


function monitorCreated(response)
{
    model.userName=response.result.userName
    model.userId=response.result.userId;
    console.log(`Monitor for user ${response.userName} is created`);
}

function monitorDenied(response)
{
    console.log(response.result); // unable to create monitor
    process.exit(0);
}

function messageArrived(response)
{
    if(response.fromUser == model.userName) console.log(`${model.userName} > ${response.message}`);
    else  console.log(`${response.fromUser} > ${response.message}`);
}

function broadcastArrived(response)
{
    console.log(`Broadcast Message from "${response.fromUser }" : "${response.message}"`);
}

function notificationArrived(response)
{
    console.log(response.message);
}
//setting up events

eventEmitter.on('loggedOut',loggedOut);
eventEmitter.on('userListArrived',userListArrived);
eventEmitter.on('monitorCreated',monitorCreated);
eventEmitter.on('monitorDenied',monitorDenied);
eventEmitter.on('messageArrived',messageArrived);
eventEmitter.on('broadcastArrived',broadcastArrived);
eventEmitter.on('notificationArrived',notificationArrived);

var clientSocket=new net.Socket();
clientSocket.connect(5500,'localhost',function(){
    console.log('connnected with chat server');
    let request=new Request();
    request.action='createmonitor';
    request.userId=process.argv[2];
    console.log('request',request)
    clientSocket.write(JSON.stringify(request));
});

clientSocket.on('data',function(data){
    let response=JSON.parse(data.toString());
    console.log('response : ',response);

    if(response.action.toLowerCase() == 'createMonitor'.toLowerCase()){
        if(response.success == true) eventEmitter.emit('monitorCreated',response);
        else eventEmitter.emit('monitorDenied',response);
    }   
    else if(response.action.toLowerCase() == 'logout') eventEmitter.emit('loggedOut',response);
    else if(response.action.toLowerCase() == 'getusers') eventEmitter.emit('userListArrived',response);
    else if(response.action.toLowerCase() == 'message') eventEmitter.emit('messageArrived',response);
    else if(response.action.toLowerCase() == 'broadcast') eventEmitter.emit('broadcastArrived',response);
    else if(response.action.toLowerCase() == 'notification') eventEmitter.emit('notificationArrived',response);
});
clientSocket.on('end',function(){
    console.log('********000000******')
})
clientSocket.on('error',function(){
    
});


