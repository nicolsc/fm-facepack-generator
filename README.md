#Football Manager - Facepack generator

##What

Tiny node script creating custom facepack from any given team

##Why

* I must confess i've been a football manager player for years :)

And i like to pimp the game interface, for example with the players faces  

[Sortitoutsi](http://sortitoutsi.net) offers an extensive facepack for the game... but i don't want to go through the hassle of downloading +6GB of pictures, most of them of players i will never see during my games  

So i came up with this utility to get a custom facepack for any teamID (pictures + config.xml)

##How

Just run
```
$ node facepack.js {teamId}
```

Copy the generated _facepack-{teamId} folder to your local folder (on MacOS, it should be '~/Documents/Sports Interactive/Football Manager 2015/graphics'

Within the game preferences, clear cache & reload skin

Enjoy your game with new faces

##Tech

* io.js
* jsdom module
* http requests to sortitousi website


