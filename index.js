
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

                                  var config=Data.config.read('machine');
                                  $.each( config, function(i,v) {
                                    interface_machine[ v['name'].trim() ] = v['value'];
                                    cc=$("#config-form *[name="+v['name']+']').val( v['value'] );
                                 });
                                 
                                  // Update some on-screen stuff
                                  $("#roomInfo").text( interface_machine.roomID + ' / ' + interface_machine.roomName )
                                  $(".video-device").text( interface_machine.videoDevice + ' (' + interface_machine.videoFormat + ')'  );
                                  $(".audio-device").text( interface_machine.audioDevice );
                                  document.title='Capture-'+(interface_machine.roomID||'');

                                  // Safety checks:
                                  if( (''+interface_machine['videoDevice']) == '' ) {
                                      UI.alert( { alert:'No video device selected!' }, { type:'danger' } );
                                  };
                                  if ( (''+interface_machine['audioDevice']) == '' ) {
                                      UI.alert( { alert:'No audio device selected!' }, { type:'danger' } );
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
                           // Old -- 'setup recorder output #transcode{'+interface_machine.transcode+'}:standard{access=file,mux=mp4,dst=./video/%Y-%m-%dT%H:%M:%SZ.mp4} \n' +

                           contents = '# Media init file for ' + interface_machine.roomID + '\n\n' + 
                                      'new recorder broadcast \n'+
                                      'setup recorder input v4l2://'+interface_machine.videoDevice+':'+interface_machine.videoFormat+' \n' +
                                      'setup recorder option input-slave=alsa://'+interface_machine.audioDevice+' \n' +
                                      'setup recorder output #transcode{'+interface_machine.videoTranscode+'}:standard{access=file,mux=mp4,dst=./video/%s.mp4} \n' +
                                      'setup recorder enabled';
                   
                           Data.send({ command:'update', item:'config', file:'init-media', contents: contents, alert:true } );

                           // Re-load the stuff
                           Data.send({ command:'vlm', item:'load config/init-vlc', alert:true });

                           // Redraw everything
                          window.setTimeout( function() { 
                               interface_calendar.refresh() }
                           , 500 );
                           
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
             refreshDelay=refreshDelay*10;
             
           } else {
             $('#status-recorder').removeClass('hidden');
             $('#status-recorder .small').html( itemTime );
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

                                                     header: {  left: 'prev,next today',  center: 'title',  right: 'month,agendaDay'},
                                                     contentHeight: 500,
                                                     handleWindowResize: true ,
                                                     selectable: true,
                                                     selectHelper: true,
                                                     now:  moment(),
                                                     defaultView : 'month',
                                                     defaultTimedEventDuration : '00:15:00',
                                                     slotDuration : '00:15:00',
                                                     firstHour : 7,
                                                     allDaySlot : false,

                                                     eventClick: Data.calendar.handler.event,
                                                     dayClick: Data.calendar.handler.day,
                                                     select : Data.calendar.select,
                                                     events : Data.calendar.events
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
                                      "event" : function( event, jsEvent, view) {

												   interface_calendar.element.fullCalendar( 'unselect' );

                     	                            UI.dialog({ 

                                                        title : 'Scheduled Recording',

  												         body : '<div><label class="label label-default">Title</label> '+event.title+'</div>'+
  														         '<div><label class="label label-default">Starts</label> '+event.start.calendar()+'</div>'+                      
														         '<div><label class="label label-default">Ends</label> '+event.end.calendar()+'</div>',
 
                                                        buttons : [
                                                                     { 
                                                                       caption:'Cancel Recording',
                                                                       className:'btn-danger',
                                                                       data : { "event" : event } ,
									                                   click : function() { 
                                                                                            if(window.confirm('Are you sure?')) {
								                                                                  interface_calendar.delete( $(this).data('event') );
								                                                                  UI.dialog("close");
								                                                            }
                                                                                            
                                                                                }
                                                                     }
                                                                  ]
                                                    });
                                      },

                                     "day" :  function( date, jsEvent, view) {

											   if( (view.name!='agendaDay') &&  ( !date.isBefore() )  ) {
												   interface_calendar.element.fullCalendar( 'gotoDate', date );
												   interface_calendar.element.fullCalendar('changeView','agendaDay');
			             					   }
                                      }
         },
          
          "select" : function( startMoment, endMoment, jsEvent, view) {

                   if( view.name == 'agendaDay') {
           
                       interface_calendar.element.fullCalendar( 'unselect' );

                       duration=moment.duration( endMoment.diff( startMoment, 'minutes' ) , 'minutes').humanize();

                       UI.dialog({

         
                                   title : '<span class="glyphicon glyphicon-calendar"></span>  Add a Scheduled Recording',

                                   body : '<form id="schedule-form" class="form-horizontal" onsubmit="return false" >' + 
						                    '<div class="form-group">' + 
                                              '<label class="control-label col-sm-3">Starts</label><div class="col-sm-9"><p class="form-control-static">'+startMoment.calendar()+'</p></div>'+
                                            '</div>'+
						                    '<div class="form-group">' + 
                                              '<label class="control-label col-sm-3">Ends</label><div class="col-sm-9"><p class="form-control-static">'+endMoment.calendar()+' (duration of '+duration+')</p></div>'+
                                            '</div>'+
						                    '<div class="form-group">'+
                                                 '<label class="control-label col-sm-3">Title</label>'+
                                                 '<div class="col-sm-9">'+
                                                    '<input type="text" class="form-control input-required" name="title">'+
                                                  '</div>'+
                                            '</div>'+
						                    '<div class="form-group">'+
                                                 '<label class="control-label col-sm-3">Owner</label>'+
                                                 '<div class="col-sm-9">'+
                                                    '<input class="form-control input-required" name="owner">'+
                                                  '</div>'+
                                            '</div>'+
						                    '<div class="form-group">'+
                                                 '<label class="control-label col-sm-3">Keywords</label>'+
                                                 '<div class="col-sm-9"><input class="form-control" name="keywords"></div>'+
                                            '</div>'+
						                    '<div class="form-group">'+
                                                 '<label class="control-label col-sm-3">Description</label>'+
                                                 '<div class="col-sm-9"><textarea class="form-control" name="owner"></textarea></div>'+
                                            '</div>'+
						                    '</form>',

                                  buttons : [
                                                  {
                                                    name : 'Save',
                                                    type : "submit",
                                                    caption : 'Add Recording',
                                                    className : 'btn-primary',
                                                    data : { start:startMoment, end:endMoment },
                                                    click : function() {
                                                       console.log("test");
                                                      $(".has-error").removeClass("has-error");
                                                        $(".input-required").each( function(k,e) {
                                                           if ( ( $(e).val() || '') == '' ) {
																$(e).closest(".form-group").addClass("has-error");
                                                            }
                                                         });
                                                    }
 
                                                  }
                                            ],

                                  onShown : function() {
                                            }
                      


                     });
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

                         response = $.ajax({
                                type: "POST",
                                url: interface_common.urlInfo,
                                async: false,
                                data : $(form).serialize(),
                            }).responseText;

                         UI.alert ( response );

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

                     eventColor = eventName.indexOf('ADHOC') ? 'darkolivegreen' : 'darkseagreen' ;

                     event = ( events[eventID] );

                     if(!event) {
                        event={ eventID:eventID,
                                courseID:eventName,
                                title:eventName,
                                durationEditable : false,
                                allDay:false,
                                color:eventColor,
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

              eventStart=new Date(v.start);
              eventEnd=new Date(v.end);

              if( !v.hasStart ) { v.allDay=true; v.title = v.title + ' (until '+Format.time.compressed(v.end)+')'; v.color='deeppink'; }
              if( (calendarStart <= eventStart) && ( eventEnd <= calendarEnd ) ) {
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

         "init" : function() {
            interface_audio.setup.devices();
            interface_audio.setup.controls();
         },

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


         "init" : function() {
                     interface_video.setup.devices();
                     interface_video.setup.formats();
                     interface_video.setup.controls();
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
		                                        
                                                current['value']='width='+current.width+':height='+current.height+':chroma='+current.chroma;
		                                        current['name'] = current.chroma+' / ' + current.size;
                                                formats.push( current );

                                                current={ chroma:current.chroma };
                                                break;
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

          "show" : function() {

              // Make a preview media object

              var streamTranscode=':standard{access=http,mux=ts,dst=:8889/preview}';
              var streamURL='http://'+window.location.hostname+':8889/preview';
              var streamType='video/mp4';

              Data.queue.add( { command:'vlm', item:'del preview'} );

              config=Data.config.read('init-media',true).split('\n');
              $(config).each( function(k,v) {
                  line=v;
                   if(  line.indexOf('recorder') > 0 ) {
                       line=line.replace('recorder','preview');
                       spot=line.indexOf(':standard{');
                       if( spot > 0 ) {
                          line=line.substr(0,spot)+streamTranscode;
                       }
                   Data.queue.add( { command:'vlm', item:line } );
                  console.log( line );
                   }
              });

              // Set a safety timer
              Data.queue.add( { command:'vlm', item:'new s0-preview-stop schedule' } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop date '+Format.date.schedule( moment().add(5,'minutes').toDate() ) } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop append control preview stop' } );
              Data.queue.add( { command:'vlm', item:'setup s0-preview-stop enabled' } );
              Data.queue.add( { command:'vlm', item:'control preview play'} );

              // Send commands to the engine
              Data.queue.send();
            
              // var content='<html>'+
              //            '<head><title>Camera Preview</title></head>'+
              //            '<body>'+

             
              var content = '<html>'+
								'<head>'+
								'  <meta charset="UTF-8">'+
								'  <title>Preview</title>'+
								'  <link rel="stylesheet" type="text/css" href="//maxcdn.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.css"  />'+
								'</head>'+
								'<body>'+
				                  '<div style="text-align:center;z-index:99;padding : 1em;">' +
				                    '<object style="width:99%;height:90%;" id="preview-video-object" type="application/x-vlc-plugin" data="'+streamURL+'" controls="yes">' +
				                    ' <param name="movie" value="'+streamURL+'"/>' + 
				                    ' <param name="allowFullScreen" value="true"/>' + 
				                    ' <param name="network-caching" value="150"/>' + 
				                    ' <embed type="application/x-vlc-plugin" autoplay="yes"  loop="no" target="'+streamURL+'" />' + 
				                   '</object>'+
				                   '</div>' +
								'</body>'+
							'</html>';

              pWindow=window.open( "", "", "menubar=0,scrollbars=0,width=320,height=200" );

              pWindow.document.open();
              pWindow.document.write( content );
              pWindow.document.close();

              pWindow.document.onClose=function() { parent.interface_preview.hide(); };
              $(pWindow).unload(  function() { interface_preview.hide(); } );

              
          },

          "hide" : function() {

             Data.queue.add( { command:'vlm', item:'control preview stop'} );
             Data.queue.add( { command:'vlm', item:'del s0-preview-stop' } );
             Data.queue.add( { command:'vlm', item:'del preview' } );
             Data.queue.send();


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
               Data.send( { command:'control', item:'reboot', alert:true } );          
           },

           "update" : function() {
               Data.send({ command:'update', item:'software', alert:true } );         
               window.setTimeout( function() { location.reload(true) } , 1000);
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
                                url: "api.xml",
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
                 "video" : interface_video,  
                 "audio" : interface_audio,  
              "calendar" : interface_calendar,
              "preview"  : interface_preview,


            "render" : {
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
                      bb=$('<button class="btn '+(button.className||'')+'">' + 
                            (button.caption||'Button')+
                            '</button>' )
                          .attr( "type", (button.type || 'button' ) )
                          .data( (button.data || {} ) ) 
                          .click( (button.click || function() {}) );        
                      dbb.append(bb);
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

              var alertOptions= $.extend( { offset: { from:'top', amount: 20 }, align:'right', type:'info', width:300, delay:2500 } , (displayOptions || {} ) );

              alertOptions.delay=(alertOptions.type=='danger') ? 9999 : 2500;

              $.bootstrapGrowl( alertDisplay, alertOptions );

              if( alertObject.log ) {
                   UI.log( alertObject );
              }
            },

          "init"    : function() {

              UI.preview.hide();
              UI.calendar.init();
              UI.video.init();
              UI.audio.init();
              UI.recordings.init();

              $(".datepicker").datetimepicker( { pickTime : false });
              $(".timepicker").datetimepicker( { pickDate : false, useSeconds:false, minuteStepping: 15  });

              $("#software-version").html(   Data.send( { command:'machine', action:'get', item :'version'} ).result  );

              $("#debug-common").on("change", function() {
                 $("#debug-object").val( '{' + $(this).val() + '}' );
              });

              $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                       interface_calendar.refresh();
              });

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
                  items = items + '<div class="row"><div class="col-sm-3"><b>'+k+'</b></div><div class="col-sm-9">'+v+ '</div></div>';
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


