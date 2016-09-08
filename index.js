
$(document).ready( function() {  
              Data.init();
              UI.init();
 });



// ----------------------------------------------------------
// ----------------------------------------------------------

var btn = $.fn.button.noConflict() // reverts $.fn.button to jqueryui btn
$.fn.btn = btn // assigns bootstrap button functionality to $.fn.btn

jQuery.fn.exists=function(){ return this.length>0;}

jQuery.fn.redraw = function() {
    return this.hide(0, function() {
        $(this).show();
    });
};


String.prototype.parseAsObject = function( controlObject  ) {

   var returnObject={};

   var oo=$.extend( { itemSep:',', valueSep:'=', forceLower:true }, controlObject );     

   var aa=this.split( oo.itemSep );

   $.each(aa, function( kk, vv ) {
           var items=vv.split( oo.valueSep );
           returnObject[ (oo.forceLower) ? items[0].toLowerCase() : items[0] ]=items[1];
   });                                  
  return returnObject;
}

String.prototype.parseAsPairs=function() {
 var x=[];
 $.each( this.split("\n"), function(i,v) {

   v = v.ltrim();
   if( v.length > 1 && v.charAt(0) != "#" && (v.indexOf("=")>0) ) {

     var name='';
     var value='';

     var pair=v.split( /=(.+)/ );

     var name=pair[0].replace('=','');

     if( pair[1] ) {
          value=pair[1]
           .replace(/\+/g," ")
           .replace(/"/g,'');
     }

     x.push( { "name" : name, "value" : value } );
   }

 })
 return x;
}


String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}


moment.lang('en', {
    calendar : {
        lastDay : '[Yesterday at] LT',
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        lastWeek : '[last] dddd [at] LT',
        nextWeek : 'LLL',
        sameElse : 'LLL'
    }
});


// ----------------------------------------------------------
var interface_common = {

                "read" : function(setting) {
                
                      var common=Data.config.read('common');

                      $.each( common, function(k,v) {
                         interface_common[v.name] = v.value;
                      });

                }
}


// ----------------------------------------------------------
var interface_machine = {


                      "status" : function() {

                         var cc=$("#machine-status");
                         cc.empty();

                         var items=[
                                   { command:'machine', item: 'host' },
                                   { command:'machine', item: 'sensors'} ,
                                   { command:'machine', item: 'space'} 
                               ];

                         $.each( items, function(k,v) {

                           var info=Data.send(v);
                           if( info['result'] ) { 
                             cc.append('<pre>'+Format.object.html(info.result)+'</pre>' );
                           };
                         });

                      },

                      "read" : function() {

                                  interface_audio.setup.devices();
                                  interface_video.setup.devices();

                                  // Read the config file
                                  var config=Data.config.read('machine');
                                  $.each( config, function(i,v) {
                                    interface_machine[ v['name'].trim() ] = v['value'];
                                    cc=$('#config-form *[name='+v['name']+']').val( v['value'] );
                                  });

                                  // Dependent stuff
                                  interface_video.setup.formats();
                                  cc=$('#config-form *[name=videoFormat]').val( interface_machine.videoFormat );
 
                                  // Update some on-screen stuff
                                  document.title='Capture-'+(interface_machine.roomID||'');
                                  $("#roomInfo").text( interface_machine.roomID + ' / ' + interface_machine.roomName )

                                  // Safety checks:
                                  if( (''+interface_machine['videoDevice']) == '' ) {
                                      UI.alert( { alert:'No video device selected!' }, { type:'danger' } );
                                  };
                                  if ( (''+interface_machine['audioDevice']) == '' ) {
                                      UI.alert( { alert:'No audio device selected!' }, { type:'danger' } );
                                  };

                                  var hostname=Data.send ( { command:'machine', item:'hostname' } ).result;

                                  if ( hostname.toLowerCase().indexOf( interface_machine.roomID.toLowerCase() ) == -1 ) {
                                    $('.action-hostname').removeClass('hidden');
                                    $('.action-hostname').find('span.hostname').html( ('capture-'+interface_machine.roomID).toLowerCase() );
                                  };

                        },

                        "write" : function() {

                           config=$("#config-form").serializeArray();
                           contents='';

                           $.each( config, function(i,item) { 
                               contents += item.name+'="'+item.value+'"\n';
                           });

                           Data.send({ command:'update', item:'config', file:'machine', contents: contents, alert:true } );
                           interface_machine.read();
            
                           // Build a new media init file
                           contents='# Media init file for ' + interface_machine.roomID + '\n\n' + 
                                  'del media \n' + 
                                  '# -------------------\n'+
                                  'new recorder broadcast \n'+
                                  'setup recorder input v4l2://'+interface_machine.videoDevice+':'+interface_machine.videoFormat+' \n' +
                                  'setup recorder option input-slave=alsa://'+interface_machine.audioDevice+'\n' +
                                  'setup recorder output #transcode{threads=2,'+interface_machine.videoTranscode+'}:standard{access=file,mux=mp4,dst=./video/%s.mp4}\n' +
                                  'setup recorder enabled \n'+
                                  '# -------------------\n'+
                                  'new preview broadcast \n'+
                                  'setup preview input v4l2://'+interface_machine.videoDevice+':'+interface_machine.videoFormat+'\n' +
                                  'setup preview option input-slave=alsa://'+interface_machine.audioDevice+'\n' +
                                  'setup preview output #transcode{sfilter=marq{marquee="'+interface_machine.roomID+' @ %Y-%m-%d %H:%M:%S",opacity=128,position=5},threads=2,vcodec=theo,vb=2000,scale=1,acodec=vorb,channels=2,ab=64,samplerate=22050}:http{mux=ogg,dst=:8889/preview.ogg}\n'+
                                  '# -------------------\n'+
                                  'setup preview enabled';
                   
                           Data.send({ command:'update', item:'config', file:'init-media', contents: contents, alert:true } );


                           // Re-load the stuff
                           Data.send({ command:'vlm', item:'load config/init-vlc', alert:true });

                           // Redraw everything
                           UI.reload();
                           
                        }
}                

// ----------------------------------------------------------

var interface_media =  { 

        "refresh" : function( delay ) {
            window.setTimeout(  function() { interface_media.read() }, (delay || 5) );
         },

        "monitor" : function() {

           if (interface_media.monitorTimer) {
             window.clearTimeout( interface_media.monitorTimer);
           };

           var response=Data.send( { command:'vlm', item:'show recorder' } );

           var itemTime='';
           var refreshDelay=3000;
           try {
             itemTime=( response['result']['recorder']['instances']['instance']['time']  );
           } 
           catch(err) {
             itemTime='';
           };
             
           if( itemTime == '') {
             $('#status-recorder').addClass('hidden');
             $('#link-preview').removeClass('hidden');
             refreshDelay=refreshDelay*10;
             
           } else {
             $('#status-recorder').removeClass('hidden');
             $('#status-recorder .small').html( itemTime );
             $('#link-preview').addClass('hidden');
           };

           interface_media.monitorTimer=window.setTimeout( function() { interface_media.monitor() }, refreshDelay );
        },        

        "handler" : {
				             "click" : function(event) {

                                  control=$(event.target);

                                  item=control.parents(".media-item");

			                      vlc=$(item).data('vlc');

				                  action=( vlc.instances ) ? 'stop' : 'play';

				                  Data.send( { command:'vlm', item: 'control '+vlc.name+' '+action, alert:true } ) ;

   		                          interface_media.refresh(3000);

                     }
        },


        "add" : function( name, settings ) {

                    var vlc=$.extend( { name:name }, settings );

                    var label=$('<b></b>')
                          .addClass('label label-default')
                          .html(name);
 
                    var control=$('<a href="#"></a>')
                            .addClass("link control glyphicon glyphicon-play")
                            .click( interface_media.handler.click );

                    var widget=$('<h4></h4>', { id:'media-'+name })
                         .data("vlc", vlc)
                         .addClass("media-item")
                         .append( label )
                         .append( '   ' )
                         .append( control )
                         .appendTo("#status-media");

                    return widget;
        },


        "read" : function() {
return; 
          var response=Data.send( { command:'vlm', item:'show media' } );

           var items='';
           try {
             items=( response['result']['media'] || {} );
           } 
           catch(err) {
              UI.alert( 'No media devices in VLC ');
              return;
           };

           $.each( items, function( name, vlc ) {

                  var item=$('#media-'+name);
                  if( !item.exists() ) { item=interface_media.add( name, vlc ) };

                  var vlc=$(item).data("vlc");

                  if ( vlc['instances'] ) {

                    $(item).find(".control")
                           .removeClass("glyphicon-play")
                           .addClass("glyphicon-stop");

                     interface_media.refresh(1500);
                     interface_recordings.refresh(1500);

                  } else {

                    $(item).find(".control")
                           .removeClass("glyphicon-stop")
                           .addClass("glyphicon-play");

                  };

                $(item).data("vlc", vlc);

          });


        }

};


// ----------------------------------------------------------
var interface_calendar = {

          "element" : $("#event-calendar"),
        

          "init" : function() {

                      interface_calendar.element.fullCalendar( {  

                                                     header: {  left: 'prev,next today',  center: 'title',  right: 'month,agendaWeek,agendaDay'},
                                                     contentHeight: 500,
                                                     handleWindowResize: true ,

                                                     selectable: true,
                                                     selectHelper: function( momentStart, momentEnd ) {

                                                         duration=momentEnd.diff( momentStart, 'minutes');

                                                         return $('<div class="fc-event fc-select-helper">'+
                                                                  '<span class="badge label label-warning"><span class="glyphicon glyphicon-time"></span>  '+duration+' minutes</span>  '+
                                                                  '(<b>'+momentStart.format("h:mm a")+'</b> to <b>'+momentEnd.format("h:mm a")+'</b>)'+
                                                                  '</div>');
                                                     },

                                                     now:  moment(),
                                                     defaultView : 'month',
                                                     defaultTimedEventDuration : '00:10:00',
                                                     slotDuration : '00:10:00',
                                                     firstHour : 7,

                                                     allDaySlot : false,
                                                     allDayDefault : false,

                                                     timeFormat : {
                                                          agenda : 'h:mm T',
                                                          month : 'h(:mm)t'
                                                     },
                                                     displayEventEnd : {
                                                          agenda : 'h:mm T',
                                                          month : 'h(:mm)t'
                                                     },

                                                     viewRender : function(v,e) { $("#event-calendar-tools").removeClass("hidden") },
                         
                                                     eventClick: Data.calendar.handler.event,
                                                     dayClick: Data.calendar.handler.day,
                                                     select : Data.calendar.handler.select,

                                                     eventSources : [
                                                         {
                                                           events : Data.calendar.events,
                                                           color  : '#2F4F4F',
                                                           textColor : '#FFFFFF'
                                                         },
                                                         {
                                                           url : 'config/schedule-local',
                                                           color  : '#8A2BE2',
                                                           textColor : '#FFFFFF'
                                                         }

                                                    ] 
                                              });

                      $(".calendar-controls").removeClass("hidden");                 


          },

          "fetch" : function( stage ) {
                      if( interface_machine.urlSchedule != "" ) {
                         Data.send({ command:"update", item:"schedule", before:'Loading Schedule for '+interface_machine.roomID+'.  Stand by...', alert:true});
                         setTimeout( function() { interface_calendar.refresh() }, 2000 );
                      }
          },

          "clear" : function() {
   			         Data.send({ command:'update', item:'schedule-clear', alert:true } );         
					 interface_calendar.refresh();               
          },

          "refresh" : function() {
                      interface_calendar.element.fullCalendar( 'removeEvents' );
                      interface_calendar.element.fullCalendar( 'refetchEvents' );
                      interface_calendar.element.fullCalendar( 'rerenderEvents' );
          },

          
          "handler" : {
                                   "attachmetadata" : function( event ) {

                                                  response=Data.send( { command:"parse", action:"meta-id",  item:event.eventID+'-'+event.courseID } );

                                                  if( response.result ) {
                                                    var meta=response['result'].split("|");
                                                    event['title']=( meta[3] || '' );
                                                    event['description']=( meta[4] || '');
                                                    event['owner']= ( meta[5] || '' );
                                                  }

                                                  return event;

                                   },

  							       "validate" : function( startMoment, endMoment ) {

												var rangeCheck=moment().range( startMoment, endMoment );

                                                var returnObject={ conflict:false }
 
                                                $.each( $(interface_calendar.element).fullCalendar('clientEvents'), function(k,event) {
                                                  rangeEvent=moment().range( event.start, event.end );

                                                  if ( rangeCheck.overlaps(rangeEvent)  ||  rangeEvent.overlaps(rangeCheck) ) {
                                                   returnObject.conflict=true;
                                                   returnObject.range=rangeEvent;
                                                   return false;
                                                  }
                                                  return true;
                                                });
                                               return returnObject;
							        },


                                    "event" : function( event, jsEvent, view) {

												  interface_calendar.element.fullCalendar( 'unselect' );
                                                  UI.render.schedule( interface_calendar.handler.attachmetadata( event )  );
                                      },

                                     "day" :  function( date, jsEvent, view) {

											   if( (view.name =='month') &&  ( !date.isBefore() )  ) {
												   interface_calendar.element.fullCalendar( 'gotoDate', date );
												   interface_calendar.element.fullCalendar('changeView','agendaDay');
			             					   }
                                      },
          
									  "select" : function( startMoment, endMoment, jsEvent, view) {

												   interface_calendar.element.fullCalendar( 'unselect' );

												   if( view.name.indexOf('agenda') == -1 ) { return false };

												   if( startMoment.isBefore( moment() )) { 
                                                       UI.alert('<b>Cannot Schedule</b> : Start date/time has already passed!', { type:'danger' });
                                                       return false;
                                                   };
                                                   

												   validate=interface_calendar.handler.validate( startMoment, endMoment );
												   if( validate.conflict ) {
														UI.alert( 'Cannot add:Conflicts with existing schedule', { type:'danger', duration:3000 } );
														return false;
												   };

												   event=interface_calendar.handler.attachmetadata( { start:startMoment, end:endMoment, sID:'', courseID:'' } );
												   UI.render.schedule( event );

									  }
          },

          "delete"     : function( calendarEvent ) {

                       scheduleID=calendarEvent.eventID+'-'+calendarEvent.courseID;

                       command = 'del '+scheduleID+'-start';
                       Data.send( { command:'vlm', item:command } );

                       command = 'del '+scheduleID+'-stop';
                       Data.send( { command:'vlm', item:command } );

                       interface_calendar.refresh();
                           
          },

          "add"     : function( form ) {
          },
          
          "events"  : function( calendarStart, calendarEnd,  timezone, callback ) {
           vlcStatus=Data.send( { command:'vlm', item:'show schedule'} );

           var events={};
           $.each( (vlcStatus.result.schedule || {}), function(k,v) {
                  if ( v['next launch'] ) {

                     eventInfo=k.split("-");
                     eventID=eventInfo[0];
                     eventName=eventInfo[1];
                     eventType=eventInfo[2];
                     eventLaunch=v['next launch'].substring(0,19);

                     event = ( events[eventID] );

                     if(!event) {
                        event={ eventID:eventID,
                                courseID:eventName,
                                title:eventName,
                                durationEditable : false,
                                allDay:false,
                                start:eventLaunch
                               };
                     }

                     if(eventType=='start') {
                       event['start']=eventLaunch;
                       event['hasStart']=true;
                     }
                     else {
                       event['end']=eventLaunch; 
                       event['hasEnd']=true;
                     }             

                    events[eventID] = event;

                  }                                           

           });

          eventsArray=[];
          $.each( events, function(k,v) {

              eventStart=moment(v.start, "YYYY-MM-DD hh:mm:ss");
              eventEnd=moment(v.end, "YYYY-MM-DD hh:mm:ss");

              if( !v.hasStart ) { v.allDay=true; v.title = v.title + ' (until '+Format.time.compressed(v.end)+')'; v.color='deeppink'; }

              if( calendarStart.isBefore( eventStart ) && calendarEnd.isAfter( eventEnd ) ) {
               eventsArray.push(v) 
              }

           });


          if(callback) {
           callback(eventsArray);
          } else {
           return(eventsArray);
          }

        }

};

// ----------------------------------------------------------

var interface_audio = {


         "setup" : {
						 "devices" : function() {
                            ss=$('#config-form select[name=audioDevice]');
                            ss.empty();
 						    ss.append('<option value="">-none-</option>');

							 $(interface_audio.devices()).each( function(k,device) {
								ss.append('<option value="'+device.alsa+'">'+device.name+'</option>');
                			 });

                             ss.val( interface_machine.audioDevice);

						 },

                         "controls" : function() {
							 UI.render.sliders( $("#audio-controls"), interface_audio.controls(), { title:interface_machine.audioDevice } );
                         }
         },


         "write" : function() { 

                contents='';
                $.each( interface_audio.controls(), function(k,v) {

                   
                   vv=(v['sendLabel']) ? '"'+v.labels[v.value]+'"' : v.value ;

                   contents=contents+'/usr/bin/amixer --device '+v.device+' sset "'+v.name+','+v.instance+'" '+vv+'\n';

                });

                Data.send( { command:"update", item:"config", file:"init-audio", contents:contents, alert:true } );

          },



         "controls" : function() {

                    var controls=[];
                    var control={};

                    try {
                       var audioCard=interface_machine.audioDevice.split(',')[0];
                       var audioItem=interface_machine.audioDevice.split(',')[1];
                    }
                    catch (err) {
                       return;
                    }
                    response=Data.send({command:'audio', action:'get', item:'controls', device : audioCard });
                    raw=response['result'].split('\n');

                    $(raw).each( function(k,v) {

                          switch ( v.substr( 0,2 ) ) {

                                    case "  " : 
		                                        item=v.split(':');
                                                append={};
                                                append[ item[0].trim().toLowerCase() ] =  item[1].trim();
                                                control = $.extend( control, append );
                                                break;

                                    case "Si" :
                                                if ( control['name'] ) { controls.push(control) };
		                                        item=v.substr(22,60).replace("'",'').split(',');
                                                control = { 
                                                            name:item[0],
                                                            instance:item[1],
                                                            device:audioCard,
                                                            caption: item[0]+' ('+item[1]+')',
                                                            change: function(e,ui) {
                                                                var oo=$(e.target).slider("option");
                                                                var value=ui.value;
                                                                 if(oo['sendLabel']) { value=oo.label( ui ) };
                                                                Data.send( { command:'audio', action:'set', device:oo.device, item:oo.name+','+oo.instance, value:value, alert:true } );
                                                                interface_audio.setup.controls();
                                                                    }
                                                           };
 	                                            break;
                            };
                 });

            if (control['name']) { controls.push(control) };

            controls=$(controls).map( function(k,v) { 

                if( (v.capabilities.indexOf('cenum') > -1 ) || (v.capabilities=='enum') ) {
                   v['labels']={};
                   v.sendLabel=true;
                   v.min=0;
                   v.max=0;
                   $.each( v.items.match(/\'[^\']*'/g) , function(kk,vv) {
                      v.labels[kk]=vv.replace(/\'/g,'');
                      v.max=kk;
                      if( v['item0'] ==vv ) { v.value=kk };
                   });
                   return v;                   
                };

                if( v.capabilities.indexOf('cvolume') > -1  ) {

                   var cc={ name:v.name, device:v.device, instance:v.instance, caption:v.caption, change:v.change };
                   try {
                       var ranges=v.limits.match(/[0-9]+/g);
                       cc.min=parseInt( ranges[0] );
                       cc.max=parseInt( ranges[1] );
                       cc.value=( v['mono'] || v['front left'] ).match(/[0-9]+/)[0];      
                   } catch (e) {
                       console.log(e);
                   }
                   return cc;                   
                };



            });
            
             return (controls);            
         },


         "devices" : function() {

                    var devices=[];

                    response=Data.send({ command:'audio', action:'get', item:'devices', device:'all' });
                    if(!response['result']) {
                     UI.alert('Found no audio devices!', { type:'danger' } );
                     return;
                    }
        
                    dd=response.result.split('\n');
                    $(dd).each( function(k,v) {
                    if(v) {
                         parts=v.split(',');

                         card=parts[0].match(/\d+/)[0];
                         device=parts[1].match(/\d+/)[0];

                         nn='('+card+') ' + parts[0].match( /\[(.*?)\]/ )[0] + ', ('+device+') ' + parts[1].match( /\[(.*?)\]/ )[0];

                         devices.push( {
                                            "card" : card,
                                            "device" : device,
                                            "alsa" : 'hw:'+card+','+device,
                                            "name" : nn
                                       });
                     }   
                   });
                      
                    return devices;
         }


};

// ----------------------------------------------------------

var interface_video = {


         "reset" : function() { 

                interface_video.setup.silent=true;

                $.each( $("#video-controls .ui-slider"), function(k,v) {

                   var ee=$(v);
                   var oo=ee.slider("option");
                  
                   if( oo.hasOwnProperty('default') ) {
                      if (oo.value != oo.default ) {
                        ee.slider( 'option', 'value', Number(oo.default) );
                      }  
                 };
                });

                delete interface_video.setup.silent;

                interface_video.setup.controls();
                UI.alert("Video default values applied");

          },


         "write" : function() { 

                settings='# Video configuration for ' + Data.machine.roomID+'\n# -------------------\n\n';
                $.each( interface_video.controls(), function(k,v) {
                     if( !v['disabled'] ) {
                       settings = settings + '/usr/bin/v4l2-ctl -c '+v.name+'='+v.value+'\n';
                     };   
                });

                Data.send( { command:"update", item:"config", file:"init-video", contents:settings, alert:true } );

          },



         "setup" : {
                      "devices" : function() {

                        var ss=$('#config-form select[name=videoDevice]');

                        ss.off("change")
                          .empty()
                          .append('<option value="">-none-</option>');

                        $( interface_video.devices()).each( function(k,device) {
                          ss.append('<option value="'+device.device+'">('+k+') '+device.name+'</option>');
                        });
                        ss.val( interface_machine.videoDevice );
                        ss.change( interface_video.setup.formats );

                       },

                       "formats" : function() {

		                    var ss=$('#config-form select[name=videoFormat]');
		                    ss.empty()
		                      .append('<option value="">-none-</option>');

		                    $( interface_video.formats()).each( function(k,format) {
		                      ss.append('<option value="'+format.value+'">'+format.name+'</option>');
		                    });

		                    ss.val( interface_machine.videoFormat );

                      },

                      "controls" : function() {
							 UI.render.sliders( $('#video-controls'), interface_video.controls(), { title:interface_machine.videoDevice+'@'+interface_machine.videoFormat }  );
    		       }
                     
         },

         "formats" : function() {

                    var formats=[];
                    var videoDevice=$('#config-form select[name=videoDevice]').val();

                    response=Data.send({ command:'video', action:'get', item:'formats', device:videoDevice });
                    if(!response['result']) {
                     return;
                    }
     
                    var lines=response.result.split('\n');
                    var current={};                        
                        
                    $(lines).each( function(k,v) {
       
                     if( v.indexOf(':') > -1 ) {

		                  item=v.split(':')[0].trim();
		                  value=v.split(':')[1].trim();

		                  switch( item ) {
		                          case "Pixel Format" :
                                                current={ chroma: value.match( /\'[^\']*'/)[0].replace(/\'/g,"") };
		                                        break;
	 
		                          case "Size" : current.size=value.match(/\w[0-9]+[x][0-9]+/g)[0];
		                                        current.width=current.size.split('x')[0];
		                                        current.height=current.size.split('x')[1];

   		                                        current['name'] = current.chroma+' / ' + current.size;
                                                current['value']='width='+current.width+':height='+current.height+':chroma='+current.chroma;

                                                formats.push( current );
                                                current={ chroma:current.chroma };

/*
		                          case "Interval" : //current.fps='0';
                                                    current.fps=value.match(/[0-9]+\.?[0-9]+(?=(\ fps))/g)[0];

      		                                        current['name'] = current.chroma+' / ' + current.size + ' / ' + current.fps+' fps';
                                                    current['value']='width='+current.width+':height='+current.height+':chroma='+current.chroma+':fps='+current.fps;

                                                    formats.push( current );
                                                    current={ chroma:current.chroma, size:current.size , width:current.width, height:current.height };
*/


                                 default : break;
		                  };
                      };

                    });
                  return formats;   

         },

         "devices" : function() {

                    var devices=[];
                    response=Data.send({ command:'video', action:'get', item:'devices', device:'all'});
                    if(!response['result']) {
                     UI.alert('Found no video devices attached!');
                     return;
                    }

                    items=response.result.replace(/:\n/g,'|').split('\n');

                    $(items).each( function(k,v) {
                        if(v) {
                         items=v.split('|');
                         device = {
                                    name : items[0],
                                    device: items[1].trim()
                                 };
                          devices.push( device );
                        };
                    });

                    return devices;
                                                    
         },
          

         "controls" : function() {

                    var controls=[];

                    response=Data.send({command:'video', action:'get', item:'controls', device:interface_machine.videoDevice });
                    raw=response['result'].split('\n');

                    $(raw).each( function(k,v) {

                             control={ change: function(e,ui) {
                                             var oo=$(e.target).slider("option");
                                             Data.send( { command:'video', action:'set', device: interface_machine.videoDevice, item:oo.name, value:ui.value, alert: (!interface_video.setup.silent) } );
                                             if( ! interface_video.setup.silent ) { interface_video.setup.controls() };
                                      }
                                     };

                             items=v.split(/\s+/);
                             $(items).each( function(kk,vv) {

                               switch( true ) {

                                 case (kk==1) : if(vv.substring(vv.length-1)==':') {
                                                  // Menu item:  get the rest of the parent line and add to the 
                                                  // most recent control's label list
                                                  vv=vv.split(':')[0];
                                                  if( !control['labels'] ) { controls.labels={} };
                                                  controls[controls.length-1].labels[vv]=v.split(':')[1];
                                                } else {
                                                  control.name=vv;
                                                }
                                                break;


                                 case (kk==2) :  control.controlType=vv.replace('(','').replace(')','');

                                                 switch ( control.controlType ) {
                                                     case 'menu' :  control.labels={};
                                                                     break;

                                                     case 'bool' : control.labels={ "0":"Off","1":"On" };
                                                                     control['min']=0;
                                                                     control['max']=1;
                                                };

                                 case (vv.indexOf('=')>0 ) : tt=vv.split('=');
                                                             switch ( tt[0] ) {

                                                               case "flags" : if(tt[1]=='inactive') {
                                                                                control.disabled=true;
                                                                              }

                                                               case "default" :
                                                               case "step" :
                                                               case "min" :
                                                               case "max" :
                                                               case "value": control[tt[0]]=Number(tt[1]);
                                                                             break;
                                                               default : break;
                                                             }

                               }
                             });

                   if(control.name  && (!control.disabled) ) { 
                      controls.push( control );
                   };
               });

             return (controls);
          },
          
};

// ----------------------------------------------------------

var interface_recordings = {


          "init"   : function() {
             interface_recordings.refresh();
          },

          "delete"  : function(filename) {
          },
          
 
          "refresh" : function( delay ) {
             if(delay) {
               window.setTimeout(  function() { interface_recordings.refresh() }, delay );
               return;
             };
 
             ff=$('#video-recordings table tbody');
             ff.empty();
         
             files=Data.send( { command:'recordings', action:'get' }  )['result'];
             if(!files) {
               ff.append( '<tr class="danger"><td>None</td></tr>' );
               return;
             };

             $.each( files.split(/\n/), function(k,v) {
                    tt=v.split('|');
                    if(tt[0]!='') {
                      ff.append( '<tr><td><button class="delete-video" data-file="'+tt[0]+'"></button><td><td class="file">'+tt[0]+'</td><td>'+tt[1]+'</td><td>'+tt[2]+'</td></tr>' );
                    };
              });

              $("button.delete-video")
                   .addClass("btn btn-xs btn-danger")
                   .text('del')
                   .confirmation({
                           file : $(this).attr("data-file"),
                           title : 'Delete this video file?',
                           placement : 'right',
                           onConfirm : function(e) {
                                                 file=$(this)[0].file;
                                                 Data.send({command:'recordings', action:'delete', file:file, alert:true} );
                                                 interface_recordings.refresh();
                                       }
              });

            },


};

// ----------------------------------------------------------

var interface_preview = {

          "start" : function() {

              if ( 
                  (interface_machine.videoDevice||'')=='' ||
                  (interface_machine.videoFormat||'')=='' ||
                  (interface_machine.audioDevice||'')==''
                 ) {
                      UI.alert( 'Missing Video or Audio configuration.', { type:'danger' } );
                      $("#link-machine").tab("show");
                      return false;
                   };
          
               if (
                    ! $("#status-recorder").hasClass("hidden")
                  ) {
                      UI.alert( 'Recording in progress!  Cannot initialize preview.', { type:'danger' } );
                      $("#link-calendar").tab("show");
                      return false;
                   }
                         

              // Load the audio and video controls
              interface_video.setup.controls();
              interface_audio.setup.controls();


              // Set a safety timer and start the preview
              Data.queue.add( { command:'vlm', item:'delete s0-preview-stop' } );
              Data.queue.add( { command:'vlm', item:'new s0-preview-stop schedule' } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop date '+Format.date.schedule( moment().add(5,'minutes').toDate() ) } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop append control preview stop' } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop enabled' } );
              Data.queue.add( { command:'vlm', item:'control preview play'} );
              Data.queue.send();
           
			  player=$("#camera-preview video")[0];
			  player.src='http://'+window.location.hostname+':8889/preview.ogg';
			  player.load();
			  player.play();
              console.log("Preview Configured");    
              
          },

          "stop" : function() {

             Data.queue.add( { command:'vlm', item:'control preview stop'} );
             Data.queue.add( { command:'vlm', item:'del s0-preview-stop' } );
             Data.queue.send();

             try {
                player=$("#camera-preview video")[0];
                player.src='';
                player.load();
                player.stop();
             } catch(e) {
             }

          }
           
};

// ----------------------------------------------------------
// ----------------------------------------------------------

var interface_actions = {

           "attach"          : function() {

             $("button").addClass("btn btn-default");
       
             $("*[data-action]")
                .css("cursor","pointer")
                .click( function() { 
                          a=$(this).attr("data-action"); 
                          eval(a+'()');
                 }
             );

             $("*[data-action].confirm").each( function(k,e) {

                 $(e).unbind("click");
                 $(e).confirmation({
                           action : $(e).attr("data-action"),
                           title :  ( $(e).attr("data-confirm-prompt") || 'Are you sure?' ),
                           placement : ( $(e).attr('data-confirm-placement') || 'left' ),
                           onConfirm : function(e) {
                                        a=$(this)[0].action;
                                        eval(a+'()');
                           }
                });
              
              });
 
            },

           "reboot"        : function() {
               Data.send( { command:'machine', item:'reboot', alert:true } );          
           },

           "update" : function() {
               Data.send({ command:'update', item:'software', alert:true } );         
               UI.reload();
          },


           "debug"        : function() {
               
               debugObject=eval('('+$("#debug-object").val()+')');
               result=Data.send( debugObject );

               console.log( result );
               $("#debug-console")
                 .empty()
                 .html( Format.object.html(result) );

                interface_media.monitor();
               }



}

// ----------------------------------------------------------
// ----------------------------------------------------------

var Data = {
                                 
                "common"   : interface_common,
                "machine"  : interface_machine,
                "media"    : interface_media,
                "audio"    : interface_audio,
                "video"    : interface_video,
                "calendar" : interface_calendar,
                "actions"  : interface_actions,
 
                "init"    : function() {
                      Data.common.read();
                      Data.machine.read();
                      Data.machine.status();
                      Data.actions.attach();
                      Data.media.monitor();
                },                                
        
                "config" : {
                                "read" : function( file, returnRaw ) {

						          var raw = $.ajax({
						                type: 'GET',
						                url: 'config/'+file,
						                async: false,
						            }).responseText;

						          if (!returnRaw ) { raw=raw.parseAsPairs() }; 
						          return raw;
                                },
                        


								"write" : function( file, contents ) {
                                   Data.send( { command:"update", item:"config", "file": file, "contents":contents , alert:true } );
								}

                },

                "queue" : { 
                             "commands_" : [],
                
                             "add" : function( commandObject ) {
                                 Data.queue.commands_.push(commandObject);
                             },

                             "send" : function() {
                                 while( Data.queue.commands_.length > 0 ) {
                                     var v=Data.queue.commands_.shift();
                                     Data.send(v);
                                 }
                             }
                },

                "send" : function( commandObject ) {
                        
                      if( commandObject.before) {
                          UI.alert( commandObject.before );
                          delete commandObject.before;
                          window.setTimeout( function() { Data.send( commandObject ) }, 500);
                          return;
                      };

                      var response = $.ajax({
                                type: "GET",
                                url: "index.json",
                                async: false,
                                data : commandObject
                            }).responseText;

                         // If we get back JSON, evaluate it
                         if( response.indexOf('{') > -1 ) {
                           try {
                               response=eval('('+response+')');
                           } catch (e) {
                               response={ error:true, alert:e, result:[] };
                           }

                         } else {
                           response={ error:true, alert:"Invalid Response from API", result:[] }
                         };

                         if( response['error'] || response['alert'] || commandObject['alert']  ) {

                             var alertOptions = (response['error']) ? { title:'Error', type:'danger', delay:99999 } : { delay:10000 };
                             UI.alert( response, alertOptions );

                         };


                     return(response);
                }

};

// ----------------------------------------------------------

var UI = {

            "recordings" : interface_recordings,  
              "calendar" : interface_calendar,
              "preview"  : interface_preview,

              "reload"   : function() {
                            window.setTimeout( function() { location.reload(true) } , 1000);
             },

            "render" : {

                                      "schedule" : function (calendarEvent) {

										   duration=calendarEvent.end.diff( calendarEvent.start, 'minutes');

										   UI.dialog({
							 
										               title : '<span class="glyphicon glyphicon-calendar"></span>  Scheduled Recording',

										               body : '<form id="schedule-form" class="form-horizontal" onsubmit="return false" >' + 
																'<div class="form-group">' + 
										                          '<label class="control-label col-sm-3">Starts</label><div class="col-sm-9"><p class="form-control-static">'+calendarEvent.start.calendar()+'</p></div>'+
										                        '</div>'+
																'<div class="form-group">' + 
										                          '<label class="control-label col-sm-3">Ends</label><div class="col-sm-9"><p class="form-control-static">'+calendarEvent.end.calendar()+' ('+duration+' minutes)</p></div>'+
										                        '</div>'+
																'<div class="form-group">'+
										                             '<label class="control-label col-sm-3">Title</label>'+
										                             '<div class="col-sm-9">'+
										                                '<input type="text" class="form-control input-required" name="title" value="'+(calendarEvent.title||'')+'">'+
										                              '</div>'+
										                        '</div>'+
																'<div class="form-group">'+
										                             '<label class="control-label col-sm-3">Owner</label>'+
										                             '<div class="col-sm-9">'+
										                                '<input class="form-control input-required" name="owner" value="'+(calendarEvent.owner||'')+'">'+
										                              '</div>'+
										                        '</div>'+
																'<div class="form-group">'+
										                             '<label class="control-label col-sm-3">Description</label>'+
										                             '<div class="col-sm-9"><textarea class="form-control" name="owner">'+(calendarEvent.description||'')+'</textarea></div>'+
										                        '</div>'+
																'</form>',

										              buttons : [
                                                                      { 
										                                active : ( (calendarEvent.eventID||'') != '' ),
                                                                        caption : 'Delete',
                                                                        className : 'btn-danger confirm',
 										                                data : calendarEvent
                                                                      },
										                              {
                                                                        active : true,
                                                                        caption : 'Save',
										                                className : 'btn-primary',
										                                data : calendarEvent,
										                                click : function() {

										                                  canSave=true;
										                                  $(".has-error").removeClass("has-error");
										                                  $(".input-required").each( function(k,e) {
										                                     if ( ( $(e).val() || '') == '' ) {
																				$(e).closest(".form-group").addClass("has-error");
										                                        canSave=false;
										                                    }
										                                  });

										                                  if(canSave) {
										                                    d=$(this).data();
										                                    // Create the metadata
										                                    // Create the schedule
										                                    // Do it.
										                                  }
										                                
										                                }
					 
										                              }

										                        ]
                                                });
                      
                                      },

                                      "timepicker" : function (element) {

                                        s='<select name="'+element.attr("name")+'">';

                                        for(var h=0;h<25;h++) {
                                           for(var m=0;m<61;m++) {
                                             console.log(h + ' : ' + m);
                                           };
                                        };

                                      },

                                      "sliders" : function ( parent, controlArray, displayOptions ) {

												 cc=$('<div></div>').addClass("list-group");

												 $( controlArray ).each( function(k, sliderControl) {

                                                           var control = $.extend (
                                                                      { 
                                                                         range : "min",
                                                                         orientation : "horizontal",
                                                                         animate : true,
                                                                         value : 0,
                                                                         "min" : 0,
                                                                         "max" : 100,
                                                                         index : function(ui) {
                                                                                    return $.inarray( ui.label, this.labels ); 
                                                                         },
                                                                         label : function(ui) { 
                                                                                    var ll=ui.value;
                                                                                    if( this.labels ) { ll = ( this.labels[ui.value] || ll ) }; 
                                                                                    return ll;
                                                                         },
                                                                         slide : function(e,ui) {

                                                                                    var ee=$(e.target);
                                                                                    var oo=ee.slider("option");
                                                                                    ee.parents(".list-group-item")
                                                                                      .children(".badge")
                                                                                      .text( oo.label(ui) );
                                                                         }
                                                                       },
                                                                      sliderControl
                                                           );

														  cc.append( 
															 $('<a></a>')
															  .addClass("list-group-item")
															  .append( ( control.caption || control.name)  )
															  .append( $('<span class="badge">'+control.label( { value:control.value} )+'</span>') )
															  .append( $('<div></div>').slider(control) )
    													   );
 																   
												  }); 

                                             title=( (displayOptions || {})['title'] || '' );

												 $(parent)
												  .empty()
												  .append( '<i>'+title+'</i>' )
										          .append( cc );
  
 						  }

          },


            "log"   : function(responseData) {

               $('#panel-log table tbody')
                .append('<tr>' +
                          '<td>'+( responseData.timestamp || (new Date()) )+'</td>' + 
                          '<td>'+( Format.object.html( responseData.result || responseData ))+'</td>' +
                         '</tr>');

            },


            "dialog" : function( dialogOptions ) {

                 d=$("#modal-dialog");

                 if( dialogOptions == "close" )
                 {
                     if( d.data()['bs.modal'] ) { d.modal("hide") };
                     return 0;
                 };

                 dt=$("#modal-dialog .modal-title").html( dialogOptions.title || 'Attention' );
                 db=$("#modal-dialog .modal-body").html( dialogOptions.body || '' );
                 dbb=$("#modal-dialog .modal-buttons").empty();

                  $.each( (dialogOptions.buttons || [] ) , function(k, button) {


                     if( (!button.hasOwnProperty("active")) || ( button.active ) ) {

		                 bb=$('<button class="btn '+(button.className||'')+'">' + 
		                        (button.caption||'Button')+
		                        '</button>' )
		                      .attr( "type", (button.type || 'button' ) )
		                      .data( (button.data || {} ) ) 
		                      .click( (button.click || function() {}) );        
		                  dbb.append(bb);
                     };
                 });

                 d.removeData()
                  .data( dialogOptions.data || {} );
 
                 if( dialogOptions.onShown ) {  d.on('shown.bs.modal', dialogOptions.onShown() )  };
                 if( dialogOptions.onHidden ) {  d.on('hidden.bs.modal', dialogOptions.onHidden() )  };

                 d.modal();

                 return d;
            },            

            "alert" : function( alertObject, displayOptions) {
              // Types:  info, danger, success

              var alertDisplay=Format.object.html( alertObject );

              var alertOptions= $.extend( { offset: { from:'top', amount: 20 }, align:'center', type:'info', width:'450', delay:2500 } , (displayOptions || {} ) );

              alertOptions.delay=(alertOptions.type=='danger') ? (alertOptions.delay||9999) : 2500;

              $.bootstrapGrowl( alertDisplay, alertOptions );

              if( alertObject.log ) {
                   UI.log( alertObject );
              }
            },

          "init"    : function() {

              UI.calendar.init();
              UI.preview.stop();

              $(".datepicker").datetimepicker( { pickTime : false });
              $(".timepicker").datetimepicker( { pickDate : false, useSeconds:false, minuteStepping: 15  });

              $("#software-version").html(   Data.send( { command:'machine', action:'get', item :'version'} ).result  );

              $("#debug-common").on("change", function() {
                 $("#debug-object").val( '{' + $(this).val() + '}' );
              });

              $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {

                       tabFrom=e.relatedTarget.hash;
                       tabTo=e.target.hash;
                       if (tabTo=='#panel-calendar')  {  UI.calendar.refresh() };
                       if (tabTo=='#panel-preview')  {  UI.preview.start() };
                       if (tabFrom=='#panel-preview') {  UI.preview.stop(); };
              });

              $( window ).unload(  function() { UI.preview.stop(); } );
              window.setInterval( function() { UI.calendar.refresh(); }, (1 * 60 * 1000) );

              UI.log("Launched management interface");
          }

};

// ----------------------------------------------------------

var Format = {

           "time" : {
              "compressed" : function(sourceDate) {

                 mm=moment(sourceDate);
                 switch (mm.minute()) {
                     case 0: fmt="ha";
                             break;
                     default : fmt="h:mma";
                 }                
                 return mm.format(fmt);
              }
           },

           "date" : {
        
              "schedule" : function(sourceDate) {
                              // Format = 2014/01/16-17:00:00
                              //d = new Date(sourceDate);
                              //f=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate() + ' ' + d.getHours+':'+d.getMinutes()+':'+d.getSeconds();
                              //return f;
                             return moment(sourceDate).format("YYYY/MM/DD-HH:mm:ss");
              }
           },
           
           "object" : {

               "html" : function(o) {

                 if(typeof o == 'string') {
                   return o;
                 };

                 var items='';
                 $.each( o, function(k,v) {

                   if( typeof v === 'object' ) { v=Format.object.html(v) };
                   if( typeof v === 'boolean' ) { v=(v)? 'true' : 'false' }
                   v=v.replace(/\n/g,'<br>');
                  items = items + '<div class="row"><div class="col-sm-1"><b class="label label-primary">'+k+'</b></div><div class="col-sm-11">'+v+ '</div></div>';
                 });

                return items;

               }
           }
}           

// ----------------------------------------------------------

var Handler= {


                "click" : function(event) {

                    source=event.currentTarget;
                    action=$(source).attr("data-action");
                    if(action) {
                       action();
                       event.preventDefault();
                    }
        
                }
 
};

// ----------------------------------------------------------
// ----------------------------------------------------------

/* ========================================================================
 * bootstrap3-confirmation.js v1.0.1
 * Adaptation of bootstrap-confirmation.js 
 * from Nimit Suwannagate <ethaizone@hotmail.com>
 * http://ethaizone.github.io/Bootstrap-Confirmation/
 * ========================================================================
 * Copyright 2013 Thomas Jacquart <thomas.jacquart@gmail.com>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // COMFIRMATION PUBLIC CLASS DEFINITION
  // ====================================
  var Confirmation = function (element, options) {
    // First init from popover
    this.init('confirmation', element, options)
    
    var options = this.options
    
    if (options.singleton) {
      // remove others when I show me
    }
    var that = this;
    if (options.popout) {
      // close when I click outside the box
      var $tip = this.tip()
//      $('html').on('click', function(){
//	  that.leave(that)
//      })
    }
  }

  if (!$.fn.popover || !$.fn.tooltip) throw new Error('Confirmation requires popover.js and tooltip.js')

  Confirmation.DEFAULTS = $.extend({} , $.fn.popover.Constructor.DEFAULTS, {
    placement	    : 'top'
    , title	    : 'Are you sure ?'
    , btnOkClass    : 'btn btn-primary'
    , btnOkLabel    : 'Yes'
    , btnOkIcon	    : 'glyphicon glyphicon-ok' 
    , btnCancelClass: 'btn btn-default'
    , btnCancelLabel: 'No'
    , btnCancelIcon : 'glyphicon glyphicon-remove' 
    , singleton	    : false
    , popout	    : false
    , href	    : '#'
    , target	    : '_self'
    , onConfirm	    : function(){}
    , onCancel	    : function(){}
    , template	    :   '<div class="popover">'
		      + '<div class="arrow"></div>'
		      + '<h3 class="popover-title"></h3>'
		      + '<div class="popover-content">'
		      + '<a data-apply="confirmation">Yes</a>'
		      + ' <a data-dismiss="confirmation">No</a>'
		      + '</div>'
		      + '</div>'
  })


  // NOTE: CONFIRMATION EXTENDS popover.js
  // ================================

  Confirmation.prototype = $.extend({}, $.fn.popover.Constructor.prototype)

  Confirmation.prototype.constructor = Confirmation

  Confirmation.prototype.getDefaults = function () {
    return Confirmation.DEFAULTS
  }
  
  Confirmation.prototype.setContent = function () {
    var that	    = this;
    var $tip	    = this.tip()
    var title	    = this.getTitle()
    var $btnOk	    = $tip.find('[data-apply="confirmation"]');
    var $btnCancel  = $tip.find('[data-dismiss="confirmation"]');
    var options	    = that.options
    
    $btnOk.addClass(this.getBtnOkClass())
      .html(this.getBtnOkLabel())
      .prepend($('<i></i>').addClass(this.getBtnOkIcon()), " ")
      .attr('href', this.getHref())
      .attr('target', this.getTarget())
      .one('click', function() {
        options.onConfirm()
        that.leave(that)
	  })
    
    $btnCancel.addClass(this.getBtnCancelClass())
	      .html(this.getBtnCancelLabel())
	      .prepend($('<i></i>').addClass(this.getBtnCancelIcon()), " ")      
	      .one('click', function(){
          options.onCancel()
          that.leave(that)
	      })
    
    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Confirmation.prototype.getBtnOkClass = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnOkClass')
      || (typeof o.btnOkClass == 'function' ? 
	    o.btnOkClass.call($e[0]) : 
	    o.btnOkClass)
  }
  
  Confirmation.prototype.getBtnOkLabel = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnOkLabel')
      || (typeof o.btnOkLabel == 'function' ?
            o.btnOkLabel.call($e[0]) :
            o.btnOkLabel)
  }
  
  Confirmation.prototype.getBtnOkIcon = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnOkIcon')
      || (typeof o.btnOkIcon == 'function' ?
            o.btnOkIcon.call($e[0]) :
            o.btnOkIcon)
  }

  Confirmation.prototype.getBtnCancelClass = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnCancelClass')
      || (typeof o.btnCancelClass == 'function' ? 
	    o.btnCancelClass.call($e[0]) : 
	    o.btnCancelClass)
  }
  
  Confirmation.prototype.getBtnCancelLabel = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnCancelLabel')
      || (typeof o.btnCancelLabel == 'function' ?
            o.btnCancelLabel.call($e[0]) :
            o.btnCancelLabel)
  }
  
  Confirmation.prototype.getBtnCancelIcon = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-btnCancelIcon')
      || (typeof o.btnCancelIcon == 'function' ?
            o.btnCancelIcon.call($e[0]) :
            o.btnCancelIcon)
  }
  
  Confirmation.prototype.getHref = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-href')
      || (typeof o.href == 'function' ?
            o.href.call($e[0]) :
            o.href)
  }

  Confirmation.prototype.getTarget = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-target')
      || (typeof o.target == 'function' ?
            o.target.call($e[0]) :
            o.target)
  }

  // CONFIRMATION PLUGIN DEFINITION
  // ==============================

  var old = $.fn.confirmation

  $.fn.confirmation = function (option) {
    var that = this
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.confirmation')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.confirmation', (data = new Confirmation(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.confirmation.Constructor = Confirmation


  // CONFIRMATION NO CONFLICT
  // ===================

  $.fn.confirmation.noConflict = function () {
    $.fn.confirmation = old
    return this
  }

}(jQuery);


// ----------------------------------------

(function() {
  var $;

  $ = jQuery;

  $.bootstrapGrowl = function(message, options) {
    var $alert, css, offsetAmount;

    options = $.extend({}, $.bootstrapGrowl.default_options, options);
    $alert = $("<div>");
    $alert.attr("class", "bootstrap-growl alert");

    if (options.type) {
      $alert.addClass("alert-" + options.type);
    }

    if (options.allow_dismiss) {
      $alert.append("<span class=\"close\" data-dismiss=\"alert\">&times;</span>");
    }

    if (options.title) {
      $alert.append( '<b>'+options.title +'</b>' );
    }

    $alert.append(message);
    if (options.top_offset) {
      options.offset = {
        from: "top",
        amount: options.top_offset
      };
    }
    offsetAmount = options.offset.amount;
    $(".bootstrap-growl").each(function() {
      return offsetAmount = Math.max(offsetAmount, parseInt($(this).css(options.offset.from)) + $(this).outerHeight() + options.stackup_spacing);
    });
    css = {
      "position": (options.ele === "body" ? "fixed" : "absolute"),
      "margin": 0,
      "z-index": "9999",
      "display": "none"
    };
    css[options.offset.from] = offsetAmount + "px";
    $alert.css(css);
    if (options.width !== "auto") {
      $alert.css("width", options.width + "px");
    }
    $(options.ele).append($alert);
    switch (options.align) {
      case "center":
        $alert.css({
          "left": "50%",
          "margin-left": "-" + ($alert.outerWidth() / 2) + "px"
        });
        break;
      case "left":
        $alert.css("left", "20px");
        break;
      default:
        $alert.css("right", "20px");
    }

    $alert.fadeIn();

    if (options.delay > 0) {
      $alert.delay(options.delay).fadeOut(function() {
        return $(this).alert("close");
      });
    }
    return $alert;
  };

  $.bootstrapGrowl.default_options = {
    ele: "body",
    type: "info",
    offset: {
      from: "top",
      amount: 20
    },
    align: "right",
    width: 250,
    delay: 4000,
    allow_dismiss: true,
    stackup_spacing: 10
  };

}).call(this);


var DateRange, INTERVALS;

INTERVALS = {
  year: true,
  month: true,
  week: true,
  day: true,
  hour: true,
  minute: true,
  second: true
};

/**
  * DateRange class to store ranges and query dates.
  * @typedef {!Object}
*
*/


DateRange = (function() {
  /**
    * DateRange instance.
    * @param {(Moment|Date)} start Start of interval.
    * @param {(Moment|Date)} end   End of interval.
    * @constructor
  *
  */

  function DateRange(start, end) {
    this.start = moment(start);
    this.end = moment(end);
  }

  /**
    * Determine if the current interval contains a given moment/date/range.
    * @param {(Moment|Date|DateRange)} other Date to check.
    * @return {!boolean}
  *
  */


  DateRange.prototype.contains = function(other) {
    if (other instanceof DateRange) {
      return this.start <= other.start && this.end >= other.end;
    } else {
      return (this.start <= other && other <= this.end);
    }
  };

  /**
    * @private
  *
  */


  DateRange.prototype._by_string = function(interval, hollaback) {
    var current, _results;
    current = moment(this.start);
    _results = [];
    while (this.contains(current)) {
      hollaback.call(this, current.clone());
      _results.push(current.add(interval, 1));
    }
    return _results;
  };

  /**
    * @private
  *
  */


  DateRange.prototype._by_range = function(range_interval, hollaback) {
    var i, l, _i, _results;
    l = Math.round(this / range_interval);
    if (l === Infinity) {
      return this;
    }
    _results = [];
    for (i = _i = 0; 0 <= l ? _i <= l : _i >= l; i = 0 <= l ? ++_i : --_i) {
      _results.push(hollaback.call(this, moment(this.start.valueOf() + range_interval.valueOf() * i)));
    }
    return _results;
  };

  /**
    * Determine if the current date range overlaps a given date range.
    * @param {!DateRange} range Date range to check.
    * @return {!boolean}
  *
  */


  DateRange.prototype.overlaps = function(range) {
    return this.intersect(range) !== null;
  };

  /**
    * Determine the intersecting periods from one or more date ranges.
    * @param {!DateRange} other A date range to intersect with this one.
    * @return {!DateRange|null}
  *
  */


  DateRange.prototype.intersect = function(other) {
    var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
    if (((this.start <= (_ref1 = other.start) && _ref1 < (_ref = this.end)) && _ref < other.end)) {
      return new DateRange(other.start, this.end);
    } else if (((other.start < (_ref3 = this.start) && _ref3 < (_ref2 = other.end)) && _ref2 <= this.end)) {
      return new DateRange(this.start, other.end);
    } else if (((other.start < (_ref5 = this.start) && _ref5 < (_ref4 = this.end)) && _ref4 < other.end)) {
      return this;
    } else if (((this.start <= (_ref7 = other.start) && _ref7 < (_ref6 = other.end)) && _ref6 <= this.end)) {
      return other;
    } else {
      return null;
    }
  };

  /**
    * Subtract one range from another.
    * @param {!DateRange} other A date range to substract from this one.
    * @return {!DateRange[]}
  *
  */


  DateRange.prototype.subtract = function(other) {
    var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
    if (this.intersect(other) === null) {
      return [this];
    } else if (((other.start <= (_ref1 = this.start) && _ref1 < (_ref = this.end)) && _ref <= other.end)) {
      return [];
    } else if (((other.start <= (_ref3 = this.start) && _ref3 < (_ref2 = other.end)) && _ref2 < this.end)) {
      return [new DateRange(other.end, this.end)];
    } else if (((this.start < (_ref5 = other.start) && _ref5 < (_ref4 = this.end)) && _ref4 <= other.end)) {
      return [new DateRange(this.start, other.start)];
    } else if (((this.start < (_ref7 = other.start) && _ref7 < (_ref6 = other.end)) && _ref6 < this.end)) {
      return [new DateRange(this.start, other.start), new DateRange(other.end, this.end)];
    }
  };

  /**
    * Iterate over the date range by a given date range, executing a function
    * for each sub-range.
    * @param {!DateRange|String} range     Date range to be used for iteration
    *                                      or shorthand string (shorthands:
    *                                      http://momentjs.com/docs/#/manipulating/add/)
    * @param {!function(Moment)} hollaback Function to execute for each sub-range.
    * @return {!boolean}
  *
  */


  DateRange.prototype.by = function(range, hollaback) {
    if (typeof range === 'string') {
      this._by_string(range, hollaback);
    } else {
      this._by_range(range, hollaback);
    }
    return this;
  };

  /**
    * Date range in milliseconds. Allows basic coercion math of date ranges.
    * @return {!number}
  *
  */


  DateRange.prototype.valueOf = function() {
    return this.end - this.start;
  };

  /**
    * Date range toDate
    * @return  {!Array}
  *
  */


  DateRange.prototype.toDate = function() {
    return [this.start.toDate(), this.end.toDate()];
  };

  /**
    * Determine if this date range is the same as another.
    * @param {!DateRange} other Another date range to compare to.
    * @return {!boolean}
  *
  */


  DateRange.prototype.isSame = function(other) {
    return this.start.isSame(other.start) && this.end.isSame(other.end);
  };

  /**
    * Return the difference of the end vs start.
    *   - To get the difference in milliseconds, use range#diff
    *   - To get the difference in another unit of measurement, pass that measurement as the second argument.
    * @return milliseconds if no measure is passed in, otherwise an increment of measure
  *
  */


  DateRange.prototype.diff = function(unit) {
    if (unit == null) {
      unit = void 0;
    }
    return this.end.diff(this.start, unit);
  };

  return DateRange;

})();

/**
  * Build a date range.
  * @param {(Moment|Date)} start Start of range.
  * @param {(Moment|Date)} end   End of range.
  * @this {Moment}
  * @return {!DateRange}
*
*/


moment.fn.range = function(start, end) {
  if (start in INTERVALS) {
    return new DateRange(moment(this).startOf(start), moment(this).endOf(start));
  } else {
    return new DateRange(start, end);
  }
};

/**
  * Build a date range.
  * @param {(Moment|Date)} start Start of range.
  * @param {(Moment|Date)} end   End of range.
  * @this {Moment}
  * @return {!DateRange}
*
*/


moment.range = function(start, end) {
  return new DateRange(start, end);
};

/**
  * Check if the current moment is within a given date range.
  * @param {!DateRange} range Date range to check.
  * @this {Moment}
  * @return {!boolean}
*
*/

moment.fn.within = function(range) {
  return range.contains(this._d);
};


