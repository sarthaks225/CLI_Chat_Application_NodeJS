const net=require('net');
const events=require('events');
const readline=require('readline');


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


function acceptInput(q,ioInterface)
{
    var promise=new Promise(function(resolve,reject){
        ioInterface.question(q,function(answer){
            resolve(answer);
        });
    });
    return promise;
}

class DataModel{
    constructor()
    {
        this.user=null;
    }
}

var model=new DataModel();
var eventEmitter=new events.EventEmitter();

function processAction(action)
{
    if(action == 'login') processLoginAction();
    else if(action == 'logout') processLogoutAction();
    else if(action == 'acceptCommand') processAcceptCommandAction();
}

async function processLoginAction()
{
    let ioInterface=readline.createInterface({
        input : process.stdin, output : process.stdout
    });
    let userName=await acceptInput('username : ',ioInterface);
    let password=await acceptInput('password : ',ioInterface);
    ioInterface.close();
    let request=new Request();
    request.action='login';
    request.userName=userName;
    request.password=password;
    clientSocket.write(JSON.stringify(request));
}
function processLoginActionResponse(response)
{
    if(response.success==false)
    {
        console.log(response.error);
        processLoginAction();
    }
    else
    {
        model.user=response.result;
        eventEmitter.emit('loggedIn');
    }
}
/*
function processLogoutAction()
{
    let request=new Request();
    request.action='logout'; 
    request.userName=model.user.userName;
    request.userId=model.user.userId;
    clientSocket.write(JSON.stringify(request));
}
function processLogoutActionResponse(response)
{
    console.log(response.result);
    clientSocket.end();
}
*/

function isValidCommand(command)
{
    let tmpCommand=command.toLowerCase();
    if(tmpCommand.startsWith('logout')) return true;
    else if(tmpCommand.startsWith('getusers')) return true;
    else if(tmpCommand.startsWith('send') || tmpCommand.startsWith('message'))
    {
        let x=command.split(' ');
        if(x.length >= 3) return true;
        return false;
    }
    else if(tmpCommand.startsWith('broadcast')){
        let x=command.split(' ');
        if(x.length >= 2) return true;
        return false;
    }

    return false;
}

function processSpaces(command)
{
    while(true)
    {
        let i=command.indexOf('  '); // idexOf consecutive two spaces
        if(i == -1) break;
        command = command.replace('  ',' '); // replace two consecutive spaces with single space
    }
    return command;
}
async function processAcceptCommandAction()
{
    let ioInterface=readline.createInterface({
        input : process.stdin, output : process.stdout
    })

    while(true){
        let command=await acceptInput(`${model.user.userName} (${model.user.userId}) > `,ioInterface);
        //ioInterface.close();

        command=processSpaces(command);
        //if(command == 'logout') processAction(command)
        //let request=new Request();
        if( isValidCommand(command) )
        {   
            
            if(command.toLowerCase() == 'logout' || command.toLowerCase() == 'getusers')
            {
                let request=new Request();
                request.action=command; // this will change later on
                request.userName=model.user.userName;
                request.userId=model.user.userId;
                clientSocket.write(JSON.stringify(request));
                if (command=='logout'){ 
                    ioInterface.close();
                    processAction('login');
                    
                }
            }
            else if( command.startsWith('send') || command.startsWith('message') || command.startsWith('broadcast') )
            {
                
                if(command.startsWith('send') || command.startsWith('message')) // send ramesh god is great
                {
                    let request=new Request();
                    request.action='message';
                    let x=command.indexOf(' ');
                    request.toUser=command.substring(x+1,command.indexOf(' ',x+1));
                    x=command.indexOf(' ',x+1);
                    request.message=command.substring(x+1);
                    request.fromUser=model.user.userName;
                    clientSocket.write(JSON.stringify(request));
                    continue;
                    
                }
                else // command startsWith broadcast
                {
                    let request=new Request()
                    request.action='broadcast';
                    let x=command.indexOf(' ')
                    request.message=command.substring(x+1);
                    request.fromUser=model.user.userName;
                    clientSocket.write(JSON.stringify(request));
                    continue;
                }
            }
            break;
        }
        else {
            console.log('invalid command/syntax');
        }
        
        //else if(command != 'getusers') processAcceptCommandAction() //processAcceptCommandAction();
    }   
    ioInterface.close();
    //processAction('login');;
}
/*
function processAcceptCommandActionResponse(response)
{
    if(response.action.toLowerCase() == 'getusers')
    {
        processAcceptCommandAction();
        //eventEmitter.emit('userListArrived',response.result);
    }
    
}
*/
//event
function loggedIn()
{
    console.log(`Welcome ${model.user.userName}`);
    processAction('acceptCommand')
}

/*
function userListArrived(users)
{
    console.log('List of online users =>');
    users.forEach(function(user){
        console.log(user);
    })
    processAction('acceptCommand');
}
*/
//setting up events

eventEmitter.on('loggedIn',loggedIn);
//eventEmitter.on('userListArrived',userListArrived);


var clientSocket=new net.Socket();
clientSocket.connect(5500,'localhost',function(){
    console.log('connnected with chat server');
    processAction('login');
});

clientSocket.on('data',function(data){
    let response=JSON.parse(data);
    //console.log('response : ',response);
    if(response.action.toLowerCase() == 'login') processLoginActionResponse(response);
    else if(response.action.toLowerCase() == 'getUsers'.toLowerCase() )
    {
            if(response.success==false) console.log(response.error);
            processAcceptCommandAction();
    }
    else processAcceptCommandAction();
    //else if(response.action.toLowerCase() == 'logout') processLogoutActionResponse(response);
    //else if(response.action.toLowerCase() == 'getusers') processAcceptCommandActionResponse(response);
    //else processAction('acceptCommand');

});
clientSocket.on('end',function(){
    console.log('********000000******')
})
clientSocket.on('close',function(){
    console.log('Connection lost from server');
    process.exit(0);
})
clientSocket.on('error',function(){
    
});


