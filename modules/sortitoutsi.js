/* jshint esnext:true*/
'use strict';

const fs = require('fs');
const jsdom = require('jsdom');
const http = require('http');

const teamUrl = 'http://sortitoutsi.net/football-manager-2015/team/{id}/whatever';
const pictureUrl = 'http://sortitoutsi.net/uploads/face/{id}.png';
const facesFolder = './facepack-{id}';
const competitionUrl = 'http://sortitoutsi.net/football-manager-2015/league/{id}/whatever';
const logoUrl = 'http://sortitoutsi.net/uploads/team/{id}.png';
const smallLogoUrl = 'http://sortitoutsi.net/uploads/team_sm/{id}.png';
const regularLogosFolder = './logos-{id}';
const smallLogosFolder = './small-logos-{id}';

function delayedCallback(countdown, func){
  return function(){
    if (--countdown <= 0){
      func.apply(this, arguments);
    }
  };
}

module.exports = {
  getCompetitionPack: function(id){
    return new Promise(function(resolve, reject){
      this.getObjectChildren(id, 'competition')
      .then(
        function(teams){
          
          teams = teams.slice(700,800);
          //Now, we need to do members.length + 1 async operation
          // * Grab the {teams.length} logos (small + normal)
          // * Write the config.xml
          // Then we'll zip the facepack
          let cb = delayedCallback((teams.length+1)*2, function(){
            resolve();
          });
          
          const regularFolderName = regularLogosFolder.replace(/{id}/, id);
          const smallFolderName = smallLogosFolder.replace(/{id}/, id);
          fs.mkdir(regularFolderName, function(err){
            if (err && err.code !== 'EEXIST'){
              reject(err);
            }
            else{
              fs.mkdir(smallFolderName, function(err){
                if (err && err.code !== 'EEXIST'){
                  reject(err);
                }
                else{
                  teams.forEach(function(item){
                    this.downloadImage(regularFolderName, item, 'team')
                    .then(function(){
                      cb();
                    })
                    .catch(reject);

                    this.downloadImage(smallFolderName, item, 'team-small')
                    .then(function(){
                      cb();
                    })
                    .catch(reject);

                  }.bind(this));
                  
                  this.writeConfigFile(regularFolderName, teams, 'team')
                  .then(cb)
                  .catch(reject);

                  this.writeConfigFile(smallFolderName, teams, 'team-small')
                  .then(cb)
                  .catch(reject);
                }
              }.bind(this));
            }
          }.bind(this));
          
        }.bind(this)
      )
      .catch(function(err){
        reject(new Error(err));
      });
    }.bind(this));
  },
  getTeamPack: function(id){
    return new Promise(function(resolve, reject){
      this.getObjectChildren(id, 'team')
      .then(
        function(members){
          
          //Now, we need to do members.length + 1 async operation
          // * Grab the {members.length} picture
          // * Write the config.xml
          // Then we'll zip the facepack
          let cb = delayedCallback(members.length+1, function(){
            resolve();
          });
          
          const folderName =facesFolder.replace(/{id}/, id);
          
          fs.mkdir(folderName, function(err){
            if (err && err.code !== 'EEXIST'){
              reject(err);
            }
            else{
              
              this.writeConfigFile(folderName, members, 'person')
              .then(cb)
              .catch(reject);

              members.forEach(function(item){
                this.downloadImage(folderName, item, 'person')
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
  /**
  * Get the _children_ (people | teams)
  * From a given _object_ (team | competition)
  **/
  getObjectChildren: function(id, type){
    return new Promise(function(resolve, reject){
      const self = this;
      let url;
      switch(type){
          case 'team':
            url = teamUrl.replace(/{id}/, id);
          break;
          case 'competition':
            url = competitionUrl.replace(/{id}/, id);
          break;
          default:
            return reject(new Error('[getChildren] Unknown type '+type));
      }
      jsdom.env({
        url : url,
        scripts: ['http://code.jquery.com/jquery.js'],
        done : function(err, window){
          if (err){
            reject(new Error(err));
          }
          else{
            let items = [];
            let tmp;
            window.$('.table tbody tr').each(function(){
              tmp =self.getIdFromPicSrc( window.$('td:first img', this).attr('src'));
              if (tmp && tmp.length && tmp.length > 1){
                items.push(tmp.pop());
              }
            });

            console.log('%s items', items.length);

            resolve(items);
          }
        }
      });
      
    }.bind(this));
  },
  getConfigFile : function(members, type){
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
      output += this.getConfigRecord(entry, type);
    }.bind(this));
    
    output += '\t</list>\n';
    output += '</record>';
    
    return output;
  },
  getConfigRecord: function(id, type){
    switch (type){
        case 'person':
          return '\t\t<record from="'+id+'" to="graphics/pictures/person/'+id+'/portrait" />\n';
        case 'team':
          return '\t\t<record from="'+id+'" to="graphics/pictures/club/'+id+'/logo" />\n';
        case 'team-small':
          return '\t\t<record from="'+id+'" to="graphics/pictures/club/'+id+'/icon" />\n';
        default:
          return '';
    }
  },
  downloadImage: function(folderName, id, type){
    const saveTo = folderName+'/'+id+'.png';
    return new Promise(function(resolve, reject){
      let url;
      let wStream;
      
      switch (type){
        case 'person':
          url = pictureUrl.replace(/{id}/, id);
          break;
        case 'team':
          url = logoUrl.replace(/{id}/, id);
          break;
        case 'team-small':
          url = smallLogoUrl.replace(/{id}/, id);
          break;
        default:
          return reject(new Error('[downloadImage] Unknown type '+type));
      }
      //console.log('Fetching %', url);
      http.get(url, function(res){
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
  writeConfigFile: function(folderName, members, type){
    const fileContent = this.getConfigFile(members, type);
    return new Promise(function (resolve, reject){
      fs.writeFile(folderName+'/config.xml', fileContent, function(err){
        if (err){
          return reject(new Error(err));
        }
        resolve();
      });
    });
  },
  getIdFromPicSrc: function(url){
    return /\/([0-9]*)\.png$/.exec(url);
  }
};