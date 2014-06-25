
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
                           interface_calendar.reload();
                           
                        }
}                

// ----------------------------------------------------------

var interface_media =  { 

        "toggle" : function (item) {

            mediaName=$(item).attr('id').replace('media-','');
            status=Data.send('show '+mediaName);

            action=( status.indexOf('instance') == -1 ) ? 'play' : 'stop';
            status=Data.send('control '+mediaName+' '+action);

            $(item).button("option", "label", mediaName+' (<i>stand by</i>)')
                   .button("refresh");

            window.setTimeout( 'interface_media.read()', 3000);

        },
        
        "read" : function() {

           response=Data.send('show media');
           vlcStatus = eval( "("+response+")" );

           $.each( ( vlcStatus.result.media || {} ), function(k,v) {

                  name=k;
                  output=v.output;
                  isStreaming=( output.indexOf('http') > 0 );

                  item=$('#media-'+name);
                  if( !item.exists() ) {
                    item=$('<button>'+name+'</button>', { id:'media-'+name })
                         .attr("id", "media-"+name)
                         .appendTo('#status-media')
                         .button()
                         .click( function() { interface_media.toggle(this) } );
                 }
                 item.removeClass('active');
                 item.removeClass('idle');
                 

                 if( v['instances'] ) { 
                    name=name+' (active)';
                    currentClass='active';
                 }
                 else
                 {
                    name=name+' (idle)' ;
                    currentClass='idle';
                 };
                  
                 item.addClass( currentClass )
                     .button("option","label", name)
                     .button("refresh");
               
            });

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

          "reload" : function() {
                       interface_calendar.element.fullCalendar('changeView','month');
                       interface_calendar.element.fullCalendar( 'refetchEvents' );
                       interface_calendar.element.fullCalendar( 'rerenderEvents' );
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

              if( !v.hasStart ) { v.title = v.title + ' (running)'; v.color='deeppink'; }
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

var interface_preview = {

           "active" : false,

          "toggle" : function() {
            this.active ? this.hide() : this.show() ;
          },

         "controls" : function() {

                    collection=[];

                    response=eval('('+Data.send("show camera")+')');
                    raw=response.result.split('\n');
                    $(raw).each( function(k,v) {
                             control={
                                       orientation:'horizontal',
                                       change : function(e) {
                                                             n=$(this).data("control").name;
                                                             v=$(this).slider("option","value");
                                                             UI.alert( Data.send('camera '+n+'='+v) );
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

                                 case (kk==1) : control.name=vv;
                                                break;

                                 case (kk==99) : control.type=(vv.replace('(','').replace(')',''));
                                                break;

                                 case (vv.indexOf('=')>0 ) : tt=vv.split('=');
                                                             switch ( tt[0] ) {

                                                               case "step" :
                                                               case "min" :
                                                               case "max" :
                                                               case "value": control[tt[0]]=Number(tt[1]);
                                                                             break;
                                                               default : break;
                                                             }

                               }
                             });

               if(control.name) { collection.push( control ) };
             });

             return (collection);
          },
          
          
          "clear" : function() {
            $('#preview-controls').empty();
            $('#preview-video').empty();
          },

          "hide" : function() {
           console.log('hiding preview');
           Data.send('del preview');
           this.clear();
           this.active=false;
           $("#preview-button").button("option", "label", "preview (idle)");

          },

          "show" : function() {

           console.log('showing preview');           
           this.clear();
           
           var location=':8990/preview';
           var url='http://'+window.location.hostname+location;

           // -----------------

           Data.send("del preview");

           config=Data.readconfig('media',true).split('\n');
           $(config).each( function(k,v) {
               line=v;
               if(  line.indexOf('recorder') > 0 ) {
                   line=line.replace('recorder','preview');
                   spot=line.indexOf(':standard{');
                   if( spot > 0 ) {
                      line=line.substr(0,spot)+':standard{access=http,mux=ts,dst='+location+'}';
                   }
                 Data.send( line );
               }
           });

           Data.send("control preview play");

           // -----------------
           
            cc=$('#preview-controls');

            $(this.controls()).each( function(k,control) {

                                    cc.append( '<div class="row"><b id="'+control.name+'_status">'+control.name+'</b>');
                                    cc.append( 
                                               $('<div></div>')
                                               .data("control",control)
                                               .slider(control)
                                             );
                                    cc.append( '</div>' );
              }); 


           vv=$("#preview-video");
          
           oo=$( '<object type="application/x-vlc-plugin" width="849" height="480" data="'+url+'" controls="yes">' +
                     ' <param name="movie" value="'+url+'"/>' + 
                     ' <embed type="application/x-vlc-plugin" autoplay="yes"  loop="no" target="'+url+'" />' + 
                  '</object>' );
            vv.append( $('<div></div>').append(oo).resizable() );
                        
          $("#preview-button").button("option", "label", "preview (active)");
          this.active=true;
        }

};

// ----------------------------------------------------------
// ----------------------------------------------------------

var interface_actions = {

           "attach"          : function() {
       
             $("button[data-action]")
                .button()
                .click( Handler.click );

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

           "toggle-preview" : function() {
               UI.preview.toggle();
           },

           "reload-schedule" : function() {
               x=Data.send('update schedule');
               Data.calendar.reload();
               UI.alert(x);
           },
           

           "machine-write" : function() {
               Data.machine.write(); 
           },
           
           "update-software" : function() {
               UI.alert( Data.send('update-software') );
           },

           "send-vlc"        : function() {
               result=eval( '('+Data.send( $("#vlc-command").val() )+')' );
               $("#vlc-receive").html( Format.object.html(result) );
           },

           "reboot"        : function() {
               UI.alert( Data.send( 'control reboot' ) )          
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

            "alert" : function( responseData ) {

              details=Format.object.html( eval( '('+responseData+')' ) );
                           
              $.bootstrapGrowl( details, { 
                                        type:'warning',
                                        width: "40%"
                                       });
            },
            
          "calendar" : interface_calendar,
          "preview"  : interface_preview
};

// ----------------------------------------------------------

var Format = {
           "date" : {
              "schedule" : function(sourceDate) {
                              // Format = 2014/01/16-17:00:00
                              d = new Date(sourceDate);
                               f=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate() + ' ' + d.getHours+':'+d.getMinutes()+':'+d.getSeconds();
                              return f;
              }
           },
           
           "object" : {

               "html" : function(o) {
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
                       interface_actions[ action ]();
                       event.preventDefault();
                    }
        
                }
 


};

// ----------------------------------------------------------
// ----------------------------------------------------------



 $(document).ready( function() {  

              Data.common.read();
              Data.machine.read();
              Data.media.read();

              Data.actions.attach();
              UI.calendar.setup();
  
              Data.send("del preview");



 });




