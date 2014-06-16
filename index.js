
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
                  isStream=(output.indexOf('http'));
                  
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
                    if( output.indexOf('http') != -1 ) { UI.preview.show(name) };
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
                                '<div><label>Public?</label><select name="mode"><option value="1">Yes</option><option value="0">No</option></select></div>'+
                                '<div><label>Description</label><textarea name="description"></textarea></div>'+
                                '</form>';
                               
                       $("<div></div>")
                        .dialog ({  title : interface_machine.roomID+' - Add A Scheduled Recording',
                                    width : "40%",
                                   height : 340,
                                    modal : true,
                                 appendTo : "body",
                                   buttons: { 
                                              'Never Mind': function() { $(this).dialog("destroy") } ,
                                              'Create'    : function() { 
                                                              interface_calendar.add( $(".formAdd") ); 
                                                              $(this).dialog("destroy");
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

                     event = ( events[eventID] );

                     if(!event) {
                        event={ eventID:eventID,
                                courseID:eventName,
                                title:eventName,
                                allDay:false,
                                start:eventLaunch // If creating, use the current time as the start 
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

              if( !v.hasStart ) { v.title = v.title + ' / STOP' }
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

          "show"  :  function( mediaName ) {

               previewID='media-'+mediaName+'-preview'

               preview=$('#'+previewID);
               if( !preview.exists() ) {

                   var url='http://'+window.location.hostname+':8990/preview';
                   var width='864';
                   var height='480';

                   template =  '<object type="application/x-vlc-plugin" data="'+url+'" width="'+width+'" height="'+height+'" id="'+previewID+'-content" controls="yes">' +
                               ' <param name="movie" value="$url"/>' + 
                               ' <embed type="application/x-vlc-plugin" name="'+previewID+'-content"  autoplay="yes"  loop="no" width="'+width+'" height="'+height+'"  target="'+url+'" />' + 
                              '</object>';

                   // Create a modal dialog and throw the preview in it
                   $("<div></div>", {id:previewID} )
                   .html( template )
                   .dialog ({  title : url,
                              modal : true,
                               width: parseInt(width)+70,
                              height: parseInt(height)+70,
                            appendTo: "body",
                               close : function() { 
                                         mediaName=$(this).attr('id').split('-')[1]; 
                                         interface_media.toggle( $('#media-'+mediaName) ); 
                                         $(this).dialog("destroy")
                                       }
                            });                             
              }
            }

};

// ----------------------------------------------------------
// ----------------------------------------------------------

var interface_actions = {

           "attach"          : function() {

       
             $("button[data-action]")
                .button()
                .click( Handler.click );

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
               UI.alert( Data.send( $('#command').val() ) )               
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
                                
                "readconfig" : function( file ) {

                      raw = $.ajax({
                            type: 'GET',
                            url: 'config/'+file,
                            async: false,
                        }).responseText;

                      return raw.toObjectArray();


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

              json=(typeof responseData == "string") ? eval('('+responseData+')') : responseData;
              
              details='';
              $.each( json , function(k,v) {
                details+='<div><label>'+k+'</label>'+v+'</div>';
              });

              html='';
              html='<div class="small">'+(json.timestamp || '')+'</div>'+
                   '<hr>'+
                   details;
              
              $.bootstrapGrowl( html, { 
                                        type:'warning',
                                        width: "30%"
                                       });

 /*
              $('<div></div>')
               .dialog({
                         title : (json.command || "Command Result"),
                         width:"30%",
                         modal : true,
                         buttons: {
                                      Ok: function() { $( this ).dialog( "close" );    }
                                  }
                       })
               .html( html );
*/

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


                 $("#event-calendar").fullCalendar( {  

                                                     header: {  left: 'prev,next today',  center: 'title',  right: 'month,agendaDay'},
                                                     eventColor : '#ABABAB',
                                                     contentHeight: 500,
                                                     handleWindowResize: true ,
                                                     selectable: true,
                                                     selectHelper: true,
                                                     now:  moment(),
                                                     defaultView : 'month',
                                                     defaultEventMinutes : 15,
                                                     slotMinutes : 15,
                                                     firstHour : 7,
                                                     allDaySlot : false,

                                                     eventClick: Data.calendar.eventClick,
                                                     dayClick: Data.calendar.dayClick,
                                                     select : Data.calendar.select,
                                                     events : Data.calendar.events
                                              });

  


 });




