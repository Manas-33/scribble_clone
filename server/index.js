const express=require("express");
var http=require("http");
const app=express();
const port=process.env.PORT||3000;
var server=http.createServer(app);
const mongoose=require("mongoose");
const io=require("socket.io")(server);
const Room=require('./models/Room');
const getWord=require("./api/getWord");
//middleware
app.use(express.json());

//Database link
const DB='mongodb+srv://dalvimanas33:manas2003@cluster0.lmpkkz2.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(DB).then(()=>{
    console.log("Connection Successful!");
}).catch((e)=>{
    console.log(e);
});


io.on('connection',(socket)=>{
    console.log('hey');
    //create game callback
    socket.on('create-game',async({nickname,name,occupancy,maxRounds})=>{
        try {
            const existingRoom= await Room.findOne({name});
            if(existingRoom){
                socket.emit("notCorrectGame","Room with that name already exixts!");
                return;

            }
            let room =new Room();
            const word=getWord();
            room.word=word;
            room.name=name;
            room.occupancy=occupancy;
            room.maxRounds=maxRounds;
            let player={
                socketID:socket.id,
                nickname,
                isPartyLeader:true
            }
            room.players.push(player);
            room=await room.save();
            socket.join(name);
            io.to(name).emit('updateRoom',room);
        } catch (error) {
            console.log(error)
        }
    });
    //join game callback
    socket.on('join-game',async({nickname,name})=>{
        try {

            let room= await Room.findOne({name});

            if(!room){
                socket.emit('notCorrectGame','Please eneter a valid room name!');
                return;
            }

            if(room.isJoin){
                let player= {
                    socketID:socket.id,
                    nickname
                }
                room.players.push(player);
                socket.join(name);

                if(room.players.length==room.occupancy){
                    room.isJoin=false;
                }

                room.turn=room.players[room.turnIndex];
                room=await room.save();

                io.to(name).emit('updateRoom',room);

            }else{
                socket.emit('notCorrectGame','The game is in progress, please try');
            }
        } catch (error) {
            console.log(error);
        }
    });

    //white board sockets
    socket.on('paint',({details,roomName})=>{
        io.to(roomName).emit('points',{details:details});
    })
});

//listen
server.listen(port,"0.0.0.0",()=>{
    console.log("Server started and running on port:" + port);
});