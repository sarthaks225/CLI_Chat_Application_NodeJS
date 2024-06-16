const fs=require('fs');
const net=require('net');


class Response
{
    constructor()
    {
        this.result=null;
        this.action='';
        this.error=null;
        this.success=false;
    }
}


class DataModel
{
    constructor()
    {
        this.users=[];
        this.userId=0; //counter variable for alloting  id to logged in user
    }
    getUserByUserName(userName)
    {
        return this.users.find(function(user){
            return user.userName == userName
        })
    }
    getUserByUserId(userId)
    {
        return this.users.find(function(user){
            return user.userId == userId;
        })
    }
    getLoggedInUsers()
    {
        var loggedInUsers=[];
        this.users.forEach(function(user){
            if(user.loggedIn) loggedInUsers.push(user.userName);
        })
        return loggedInUsers;
    }
}

var model=new DataModel();
function populateDataStructure()
{
    var usersJSONString=fs.readFileSync('users.data','utf-8');
    var users=JSON.parse(usersJSONString).users;
    users.forEach(function(user){
        user.loggedIn=false;
        user.userId=0;
        user.monitorSocket=null;
        model.users.push(user);
    })
}
populateDataStructure();

function processRequest(request)
{
    let response=new Response();
    response.action=request.action;

    console.log('******************');
    if(request.action.toLowerCase() == 'broadcast')
    {
        let message=request.message;
        let fromUser=request.fromUser;
        
        response.message=message;
        response.fromUser=fromUser;
        model.users.forEach(function(user){
            if(user.loggedIn == true)
            {
                if(user.monitorSocket)
                {
                    user.monitorSocket.write(JSON.stringify(response));
                }
            }
        })
    }
    else if(request.action.toLowerCase() == 'message')
    {
        //let message=request.message;
        //let toUser=request.toUser;
        //let fromUser=request.fromUser;
        let fromUser=model.getUserByUserName(request.fromUser);
        //console.log('****111111111****** toUSer :',model.getUserByUserName(request.toUser));
        let toUser=model.getUserByUserName(request.toUser);
        response.fromUser=request.fromUser;
        response.toUser=request.toUser;
        response.message=request.message;
        
        if(fromUser.monitorSocket) fromUser.monitorSocket.write(JSON.stringify(response));
        
        if(toUser != fromUser && toUser.loggedIn == true)
        {
            if(toUser.monitorSocket)
            {
                toUser.monitorSocket.write(JSON.stringify(response));
            }
        }
        

        /*
        let user=model.getUserByUserName(toUser);
        if(user.loggedIn == true)
        {
            if(user.monitorSocket)
            {
                response.fromUser=fromUser;
                response.message=message;
                user.monitorSocket.write(JSON.stringify(response));
                request.
            }
        }
        */
    }
    else if(request.action.toLowerCase() == 'createMonitor'.toLowerCase())
    {
        let userId=request.userId;
        let user=null;
        if(userId!=0) user=model.getUserByUserId(userId);
        console.log('user',user)
        if(user)
        {
            request.socket.userId=userId;
            request.socket.userName=user.userName;
            user.monitorSocket=request.socket;
            response.result={'userName' : user.userName, 'userId' : user.userId};
            response.userName=user.userName;
            response.userId=user.userId;
            response.success=true;

        }
        else
        {
            response.success=false;
            response.result=`User Id ${userId} is not valid`;
        }
        request.socket.write(JSON.stringify(response));
    }
    else if(request.action.toLowerCase() == 'login')
    {
        let userName=request.userName;
        let password=request.password;
        let user=model.getUserByUserName(userName);
        
        let success=false;
        if(user)
        {
            if(user.loggedIn == true) response.error=`User ${userName} already logged in / please logout first`;
            else if(user.password==password) success=true;
            else response.error='Invalid username/password';
        }
        response.success=success;
        response.action=request.action;
        if(success)
        {
            user.loggedIn=true;
            model.userId++;
            user.userId=model.userId;
            user.socket=request.socket;
            request.socket.userId=user.userId;
            request.socket.userName=user.userName;
            response.error='';
            response.result={"userName": userName ,"userId" : user.userId};

            let notificationResponse=new Response();
            notificationResponse.action='notification';
            notificationResponse.message=`user ${userName} loggedIN`;
            model.users.forEach( (user) => {
                if(user.loggedIn)
                {
                    if(user.monitorSocket)
                    {
                        user.monitorSocket.write(JSON.stringify(notificationResponse));
                    }
                }
            });


        }
       
        console.log('----------response : ',response);
        request.socket.write(JSON.stringify(response));

    }// login part ends here
    else if(request.action.toLowerCase() == 'logout')
    {
        let userId=request.userId;
        let user=model.getUserByUserId(userId);
        if(user && user.monitorSocket)
        {
            user.monitorSocket.write(JSON.stringify(response));
        }
        user.userId=0;
        user.loggedIn=false;
        user.monitorSocket=null;
        
        let notificationResponse=new Response();
        notificationResponse.action='notification';
        notificationResponse.message=`user ${user.userName} loggedOut`;
        model.users.forEach( (user) => {
            if(user.loggedIn)
            {
                if(user.monitorSocket)
                {
                    user.monitorSocket.write(JSON.stringify(notificationResponse));
                }
            }
        });

        /*
        request.success=true;
        request.result=`Logout success for ${request.userName}`;
        request.socket.write(JSON.stringify(request),()=>request.socket.end());
        */
        //request.socket.end(JSON.stringify(request));

    }//logout part ends here
    else if(request.action.toLowerCase() == 'getusers')
    {
        let user=model.getUserByUserId(request.userId);
        console.log('33333333333333',user)
        if(user.loggedIn && user.monitorSocket){
            response.success=true;
            response.error='';

            let users=model.getLoggedInUsers(); //  for removing current user loggedInUsers array
            let index=users.findIndex(function(user){
                return user==request.userName;
            });
            users.splice(index,1);
            let loggedInUsers=[];
            users.forEach(function(user){
                loggedInUsers.push(user);
            })
            response.result=loggedInUsers;
            console.log('-------response',response);
            user.monitorSocket.write(JSON.stringify(response));

            response=new Response();
            response.success=true;
            response.action=request.action;
            user.socket.write(JSON.stringify(response));
        }
        else{
            response.error='Please open monitor window using user id';
            response.result='';
            request.socket.write(JSON.stringify(response));

        }
        
       

    }// get onlineusers part ends here
    else
    {
        request.socket.write(JSON.stringify(response));
    }
}

var server=net.createServer(function(socket){
    socket.on('data',function(data){
        var request=JSON.parse(data); //some more programming is required to handle fragments of data
        console.log('request : ',request);
        request.socket=socket;
        
        try
        {
            processRequest(request);
        }catch(error)
        {
            console.log(error);
        }
    });
    socket.on('end',function(){
       
        console.log(`Client closed connection and logout `); // more programming is required
    });
    socket.on('close',function(){

        let user=model.getUserByUserName(socket.userName);
        if(user)
        {
            if(user.monitorSocket == socket)  
            {                                   // then current socket is monitor
                user.monitorSocket=null;
            }
            else
            {
                user.userId=0;
                user.loggedIn=false;
                if(user.monitorSocket)
                {
                    let response=new Response()
                    response.action='logout';
                    response.result={'userName' : user.userName, 'userId' : user.userId};
                    user.monitorSocket.write(JSON.stringify(response));
                    user.monitorSocket=null;
                }
                user.socket=null;
                console.log('Connection closed ^^^^^^');
            }
        }
    });
    socket.on('error',function(){

        console.log('Some problem at client side'); //we will change this later
        socket.end();
       
    });
})

server.listen(5500);
console.log('Chat server is ready to accept request on port number 5500');
