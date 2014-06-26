
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


String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

String.prototype.toObjectArray=function() {
 x=[];
 $.each( this.split("\n"), function(i,v) {

   v = v.ltrim();
   if( v.length > 1 && v.charAt(0) != "#" && (v.indexOf("=")>0) ) {
     vv=v.split("=");
     name=vv[0];
     value=vv[1]
           .replace(/\+/g," ")
           .replace(/"/g,'');

     x.push( { "name" : name, "value" : value } );
   }

 })
 return x;
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
// ----------------------------------------------------------

// ----------------------------------------------------------
var interface_common = {

                "read" : function(setting) {
                
                      common=Data.readconfig('common');

                      $.each( common, function(k,v) {
                         interface_common[v.name] = v.value;
                      });

                }
}


// ----------------------------------------------------------
var interface_machine = {

                      "read" : function() {

                                  config=Data.readconfig('machine');
                                  $.each( config, function(i,v) {
                                    interface_machine[ v['name'] ] = v['value'];
                                    $("#config-"+v['name'] ).val( v['value'] );
                                  });
                                 
                                  // Update the screen display
                                  $("#roomInfo").text( interface_machine.roomID + ' / ' + interface_machine.roomName )
                                  document.title=interface_machine.roomID;
                        },

                        "write" : function() {
                           config=$("#config-form").serializeArray();
                           p='';
                           $.each( config, function(i,v) { 
                               p=p+v['name']+'='+v['value']+'&';
                           });

                           UI.alert( Data.send('update machine', p) );

                           interface_machine.read();
                           window.setTimeout( function() { interface_calendar.reloadfromserver() }, 1000 );
                           
                        }
}                

// ----------------------------------------------------------

var interface_media =  { 

        "refresh" : function( delay ) {
            window.setTimeout(  function() { interface_media.read() }, (delay || 5) );
         },
         
        "add" : function( name, settings ) {

                    vlc=$.extend( { name:name }, settings );

                    item=$('<button>'+name+'</button>', { id:'media-'+name })
                         .attr("id", "media-"+name)
                         .data("vlc", vlc)
                         .addClass("btn btn-media")
                         .appendTo("#status-media")
                         .click( function() {

                              vlc=$(this).data('vlc');

                              action=( Data.send('show '+(vlc.name)).indexOf('instance') == -1 ) ? 'play' : 'stop';
                              UI.alert( Data.send('control '+vlc.name+' '+action) );

                              $(this).removeClass("btn-success")
                                     .addClass("btn-warning");

                              $(this).data("timeout", function() {
                                  setTimeout( function() { $(this).removeClass("btn-warning"); }, 10000 );
                              });
                              interface_media.refresh(3000);
                          });

                    return item;
        },


        "read" : function() {

           var comeBack=false;

           response=Data.send('show media');
           items=( eval( "("+response+")" ).result.media || {} );

           $.each( items, function( name, vlcCurrent ) {

                  item=$('#media-'+name);
                  if( !item.exists() ) { item=interface_media.add( name, vlcCurrent ) };

                  vlc=$(item).data("vlc");

                  if ( vlcCurrent['instances'] ) {

                    clearTimeout( $(this).data("timeout") );
                    $(item).removeClass('btn-warning')
                           .addClass('btn-success')
                           .text( name + ' (active)');
                    comeBack=true;

                  } else {
                    $(item).removeClass('btn-warning')
                           .removeClass('btn-success')
                           .text( name );
                  };

          });

          if(comeBack) {
                   interface_media.refresh(1500);
          };

        }

};

// ----------------------------------------------------------

var interface_calendar = {

          "element" : $("#event-calendar"),
          

          "setup" : function() {

                      this.element.fullCalendar( {  

                                                     header: {  left: 'today',  center: 'prev,title,next',  right: 'month,agendaDay'},
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

                                                     eventClick: Data.calendar.eventClick,
                                                     dayClick: Data.calendar.dayClick,
                                                     select : Data.calendar.select,
                                                     events : Data.calendar.events
                                              });
          },

          "reloadfromserver" : function() {
                interface_calendar.reload(true);
          },
          "reload" : function( fromServer ) {

                      if( fromServer ) {
                          x=Data.send('update schedule');
                          Data.calendar.reload();
                          UI.alert(x);
                      }
                      interface_calendar.element.fullCalendar('changeView','month');
                      interface_calendar.element.fullCalendar( 'refetchEvents' );
                      interface_calendar.element.fullCalendar( 'rerenderEvents' );
                      $("#calendar-drawn").html( 'Schedule as of '+(new Date($.now())).toLocaleString() );
          },

          
          "eventClick" : function( event, jsEvent, view) {

                       interface_calendar.element.fullCalendar( 'unselect' );

                       template='<div><label>Course/Title</label>'+event.title+'</div>'+
                                '<div><label>Starts</label>'+event.start.calendar()+'</div>'+                      
                                '<div><label>Ends</label>'+event.end.calendar()+'</div>';

                       $("<div></div>")
                        .dialog ({  title : 'Recording Details',
                                    width : "40%",
                                   height : 240,
                                    modal : true,
                                 appendTo : "body",
                            closeOnEscape : true,
                                   buttons: { 
                                              'Cancel Recording'  : function() { 
                                                              if(window.confirm('Are you sure?')) { interface_calendar.delete( event) ; $(this).dialog("destroy") };
                                                            }, 
                                              'Close': function() { $(this).dialog("destroy") } ,
                                             }
                                 })
                        .html( template );
          },

          "dayClick" : function( date, jsEvent, view) {

                   if( (view.name!='agendaDay') &&  ( !date.isBefore() )  ) {
                       interface_calendar.element.fullCalendar( 'gotoDate', date );
                       interface_calendar.element.fullCalendar('changeView','agendaDay');
                   }
          },
          
          "select" : function( startMoment, endMoment, jsEvent, view) {

                   if( view.name == 'agendaDay') {
           
                       interface_calendar.element.fullCalendar( 'unselect' );

                       template='<form class="formAdd" onsubmit="return false">'+
                                '<input type="hidden" name="add" value="1">'+
                                '<input type="hidden" name="room" value="'+interface_machine.roomID+'">'+
                                '<input type="hidden" name="start" value="'+startMoment.format()+'">'+
                                '<input type="hidden" name="end" value="'+endMoment.format()+'">'+
                                '<div><label>Starts</label>' + startMoment.calendar() + '</div>'+
                                '<div><label>Ends</label>' + endMoment.calendar() + '</div>'+
                                '<div><label>Title</label><input name="title"><small>*required</small></div>'+
                                '<div><label>Owner</label><input name="owner"><small>*required, network username</small></div>'+
                                '<div><label>Description</label><textarea name="description"></textarea></div>'+
                                '</form>';
                               
                       $("<div></div>")
                        .dialog ({  title : interface_machine.roomID+' - Add A Scheduled Recording',
                                    width : "40%",
                                   height : 340,
                                    modal : true,
                                 appendTo : "body",
                                   buttons: { 
                                              'Never Mind': function() { $(this).dialog("destroy").remove() } ,
                                              'Create'    : function() { 
                                                              interface_calendar.add( $(".formAdd") ); 
                                                              $(this).dialog("destroy").remove();
                                                            } 
                                             }
                                 })
                        .html( template );
                    }             
          },

          "delete"     : function( calendarEvent ) {

                       scheduleID=calendarEvent.eventID+'-'+calendarEvent.courseID;

                       command = 'del '+scheduleID+'-start';
                       UI.alert(  Data.send(command) );

                       command = 'del '+scheduleID+'-stop';
                       UI.alert(  Data.send(command) );

                         response = $.ajax({
                                type: "POST",
                                url: interface_common.urlInfo,
                                async: false,
                                data : { "delete" : scheduleID }
                            }).responseText;
                       UI.alert(  response );

                       interface_calendar.reload();
                           
          },

          "add"     : function( form ) {

                         response = $.ajax({
                                type: "POST",
                                url: interface_common.urlInfo,
                                async: false,
                                data : $(form).serialize(),
                            }).responseText;

                         UI.alert ( response );
                         interface_calendar.reload();

          },
          
          "events"  : function( calendarStart, calendarEnd,  timezone, callback ) {

           response=Data.send('show schedule');
           vlcStatus = eval( "("+response+")" );

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
var interface_camera = {

         "defaults" : function() { 

                $.each( interface_camera.controls(), function(k,v) {
                   if( v.hasOwnProperty('default') ) {
                     $("#camera_"+v.name).slider( 'option', 'value', Number(v.default) );
                   };
                });
                UI.alert("Camera defaults set");
          },


         "setup" : function() {

             cc=$('#camera-controls');
             cc.empty();

             $(this.controls()).each( function(k,control) {

                                    cc.append( '<div class="row"><b class="small" id="'+control.name+'_status">'+control.name+'</b>');
                                    cc.append( 
                                               $('<div></div>', { id:'camera_'+control.name } )
                                               .attr("id","camera_"+control.name)
                                               .data("control",control)
                                               .slider(control)
                                             );
                                    cc.append( '</div>' );
              }); 

          },
          
         "controls" : function( forceLoad ) {

                    var controls=[];
                    
                    response=eval('('+Data.send("show camera")+')');
                    raw=response.result.split('\n');

                    $(raw).each( function(k,v) {

                             control={
                                       menu : {},
                                       orientation:'horizontal',
                                       change : function(e) {
                                                             n=$(this).data("control").name;
                                                             v=$(this).slider("option","value");
                                                             $('#'+n+'_status').html(n + ' <span class="pull-right badge">' + v + '</span>');
                                                             UI.alert( Data.send('camera '+n+'='+v) );
                                                             interface_camera.setup();
                                       },
                                       slide : function(e) {
                                                             n=$(this).data("control").name;
                                                             v=$(this).slider("option","value");
                                                             $('#'+n+'_status').html(n + ' <span class="pull-right badge">' + v + '</span>');
                                                           }
                                     };

                             items=v.split(/\s+/);
                             $(items).each( function(kk,vv) {

                               switch( true ) {

                                 case (kk==1) : if(vv.substring(vv.length-1)==':') {
                                                  controls[controls.length-1].options[kk]=vv;
                                                } else {
                                                  control.name=vv;
                                                }
                                                break;

                                 case (kk==2) : switch (vv) {
                                                     case '(menu)' : control.hasOptions=true; 
                                                                     control.options={};
                                                                     break;

                                                     case '(bool)' : control['min']=0;
                                                                     control['max']=1;
                                                };
                                                control.controlType=vv.replace('(','').replace(')','');


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

var interface_videos = {

          "setup"   : function() {
             interface_videos.refresh();
          },

          "delete"  : function(filename) {
          },
          
          "refresh" : function() {
 
             ff=$('#video-files table tbody');
             ff.empty();
         
             files=eval( '(' + Data.send('show videos') + ')' ).result;
             if(files) {
                 $.each( files.split(/\n/), function(k,v) {
                    tt=v.split('|');
                    if(tt[0]!='') {
                      ff.append( '<tr><td><button class="delete"></button><td><td class="file">'+tt[0]+'</td><td>'+tt[1]+'</td><td>'+tt[2]+'</td></tr>' );
                    };
                 });

                 ff.find("button.delete")
                   .addClass("btn btn-xs btn-danger")
                   .text("del")
                   .click( function(e) {
                      file=$(this).closest("tr").find("td.file").text();
                      UI.alert( Data.send('delete '+file) );
                      interface_videos.refresh();
                   });
              };
            },


};

// ----------------------------------------------------------

var interface_preview = {

          "show" : function() {
              var setup=[];

              // Make a preview media object
              var location=':8889/camera';
              var url='http://'+window.location.hostname+location;

              setup.push('del preview');

              config=Data.readconfig('media',true).split('\n');
              $(config).each( function(k,v) {
                  line=v;
                   if(  line.indexOf('recorder') > 0 ) {
                       line=line.replace('recorder','preview');
                       spot=line.indexOf(':standard{');
                       if( spot > 0 ) {
                          line=line.substr(0,spot)+':standard{access=http,mux=ts,dst='+location+'}';
                       }
                   setup.push(line);
                   }
              });

              // Set a safety timer
              setup.push('new s0-preview-stop schedule');
              setup.push('setup s0-preview-stop date '+Format.date.schedule( moment().add(5,'minutes').toDate() ) );
              setup.push('setup s0-preview-stop append control preview play');
              setup.push('setup s0-preview-stop enabled');

              // Send commands to the engine
              $(setup).each( function(k,v) { UI.log(v); Data.send(v) } );
            
              oo = $('<div style="text-align:center;z-index:99;">' +
                         '<object style="width:99%;height:90%;" id="preview-video-object" type="application/x-vlc-plugin" data="'+url+'" controls="yes">' +
                         ' <param name="movie" value="'+url+'"/>' + 
                         ' <embed type="application/x-vlc-plugin" autoplay="yes"  loop="no" target="'+url+'" />' + 
                    '</object></div>');
             
             // Make a dialog with the preview window
             interface_preview.dialog=oo.dialog({
                                 title: url,
                                 width: 640,
                                 height: 480,
                              appendTo : "body",
                              resizable: true,
                         closeOnEscape : true, 
                                 close : function() { interface_preview.hide(); }
                       });
              
             Data.send('control preview play');
              
          },

          "hide" : function() {

             UI.log( Data.send('control preview stop') );
             UI.log( Data.send('del s0-preview-stop') );
             UI.log( Data.send('del preview') );

             d=interface_preview['dialog'];
             if(d) {
               d.dialog("close");
               d.dialog("destroy");
             };
          }
           
};

// ----------------------------------------------------------
// ----------------------------------------------------------

var interface_actions = {

           "attach"          : function() {

             $("button").addClass("btn btn-default");
       
             $("*[data-action]")
                .click( function() { a=$(this).attr("data-action"); eval(a+'()'); }  );

            $('.page-scroll a').bind('click', function(event) {

                    $("section.active")
                     .fadeOut(100)
                     .addClass("hidden")
                     .removeClass("active");

                    $("li.active")
                     .removeClass("active");

                    $(this).closest("li")
                    .addClass("active");

                    $($(this).attr("href"))
                     .fadeIn(100)
                     .addClass("active")
                     .removeClass("hidden");

                    event.preventDefault();

                });

            },

           "reboot"        : function() {
               UI.alert( Data.send( 'control reboot' ) )          
           },

           "update" : function() {
               UI.alert( Data.send('update-software') );
           },

           "vlc"        : function() {
               result=eval( '('+Data.send( $("#vlc-command").val() )+')' );
               $("#vlc-receive").html( Format.object.html(result) );
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

                "setup"    : function() {
                      Data.common.read();
                      Data.machine.read();
                      Data.actions.attach();
                      Data.media.read();
                },                                
                "readconfig" : function( file, returnRaw ) {

                      raw = $.ajax({
                            type: 'GET',
                            url: 'config/'+file,
                            async: false,
                        }).responseText;

                      if (!returnRaw ) { raw=raw.toObjectArray() }; 
                      return raw;


                },

                "send" : function(cmd,parms) {
                        
                        url="cmd.xml?command="+encodeURIComponent(cmd)+'&'+(parms||'')

                         response = $.ajax({
                                type: "GET",
                                url: url,
                                async: false,
                            }).responseText;

                         return (response);

                }

};

// ----------------------------------------------------------

var UI = {

            "log"   : function(responseData) {
               console.log(responseData);
            },
            
            "alert" : function( responseData, displayOptions) {

              dd=eval('('+responseData+')');

              details=Format.object.html( dd );

              defaultOptions= { offset: { from:'bottom', amount: 20 }, align:'right', type:'info', width:400 };
              
              $.bootstrapGrowl( details, ( displayOptions || defaultOptions ) );

            },

          "setup"    : function() {
              UI.preview.hide();
              UI.calendar.setup();
              UI.camera.setup();
              UI.videos.setup();
          },
          "camera"   : interface_camera,  
          "videos"   : interface_videos,  
          "calendar" : interface_calendar,
          "preview"  : interface_preview
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
                   v=v.replace(/\n/g,'<br>');
                   items=items+'<li><b>'+k+'</b>  '+v+'</li>';
                 });

                 return '<ul>'+items+'</ul>';               
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



 $(document).ready( function() {  

 
              Data.setup();
              UI.setup();
              
              window.setInterval( function() { UI.calendar.reload(); }, (1 * 60 * 1000) );

 });




