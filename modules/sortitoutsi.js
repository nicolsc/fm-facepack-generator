/* jshint esnext:true*/
'use strict';

const fs = require('fs');
const jsdom = require('jsdom');
const http = require('http');

const teamUrl = 'http://sortitoutsi.net/football-manager-2015/team/{id}/whatever';
const pictureUrl = 'http://sortitoutsi.net/uploads/face/{id}.png';
const folder = './facepack-{id}';

function delayedCallback(countdown, func){
  return function(){
    if (--countdown <= 0){
      func.apply(this, arguments);
    }
  };
}

module.exports = {
  getTeamPack: function(id){
    return new Promise(function(resolve, reject){
      this.getTeamMembers(id)
      .then(
        function(members){
          
          //Now, we need to do members.length + 1 async operation
          // * Grab the {members.length} picture
          // * Write the config.xml
          // Then we'll zip the facepack
          let cb = delayedCallback(members.length+1, function(){
            resolve();
          });
          
          const folderName =folder.replace(/{id}/, id);
          
          fs.mkdir(folderName, function(err){
            if (err && err.code !== 'EEXIST'){
              reject(err);
            }
            else{
              
              this.writeConfigFile(folderName, members)
              .then(cb)
              .catch(reject);

              members.forEach(function(item){
                this.downloadPicture(folderName, item)
                .then(function(){
                  cb();
                })
                .catch(reject);
              }.bind(this));
            }
            
          }.bind(this));
          
        }.bind(this)
      )
      .catch(
        function(err){
          reject(new Error(err));
        }
      );
    }.bind(this));
  },
  getTeamMembers : function(id){
    return new Promise(function(resolve, reject){
      const url = teamUrl.replace(/{id}/, id);
      const extractIdFromPicSrcRegExp = /\/([0-9]*)\.png$/;
      
      jsdom.env({
        url : url,
        scripts: ['http://code.jquery.com/jquery.js'],
        done : function(err, window){
          if (err){
            reject(new Error(err));
          }
          else{
            let members = [];
            let tmp;
            window.$('.player_table tbody tr').each(function(){
              tmp =extractIdFromPicSrcRegExp.exec( window.$('td:first img', this).attr('src'));
              if (tmp && tmp.length && tmp.length > 1){
                members.push(tmp.pop());
              }
            });

            console.log('%s members', members.length);

            resolve(members);
          }
        }
      });
      
    });
    
  },
  getConfigFile : function(members){
    let output = '<record>\n';
    output += '<!-- resource manager options -->\n';

    output += '<!-- dont preload anything in this folder -->\n';
    output += '<boolean id="preload" value="false"/>\n';

    output += '<!-- turn off auto mapping -->\n';
    output += '<boolean id="amap" value="false"/>\n';

    output += '<!-- logo mappings -->\n';
    output += '<!-- the following XML maps pictures inside this folder into other positions\n';
    output += 'in the resource system, which allows this folder to be dropped into any\n';
    output += 'place in the graphics folder and still have the game pick up the graphics\n';
    output += 'files from the correct places\n';
    output += '-->\n';
    output += '\t<list id="maps">\n';
    
    members.forEach(function(entry){
      output += this.getConfigRecord(entry);
    }.bind(this));
    
    output += '\t</list>\n';
    output += '</record>';
    
    return output;
  },
  getConfigRecord: function(id){
    return '\t\t<record from="'+id+'" to="graphics/pictures/person/'+id+'/portrait" />\n';
  },
  downloadPicture: function(folderName, id){
    const saveTo = folderName+'/'+id+'.png';
    return new Promise(function(resolve, reject){
      let wStream;
      http.get(pictureUrl.replace(/{id}/, id), function(res){
        function onData(chunk){
          //console.log('Received %s bytes', chunk.length);
        }
        function onFinish(err){
          if (err){
            console.log('A stream error happened', err.message);  
            reject(err);
          }
          else{
            resolve();
          }

          wStream.removeListener('error', onFinish);
          wStream.removeListener('close', onFinish);
          res.removeListener('error', onFinish);
          res.removeListener('data', onData);
        }
        wStream = res.pipe(fs.createWriteStream(saveTo));
        wStream.once('error', onFinish);
        wStream.once('close', onFinish);
        res.on('error', onFinish);
        res.on('data', onData);
      });
        
    
      
    });
  },
  writeConfigFile: function(folderName, members){
    const fileContent = this.getConfigFile(members);
    return new Promise(function (resolve, reject){
      fs.writeFile(folderName+'/config.xml', fileContent, function(err){
        if (err){
          return reject(new Error(err));
        }
        resolve();
      });
    });
  }
};