
jQuery.fn.exists=function(){ return this.length>0;}

jQuery.fn.redraw = function() {
    return this.hide(0, function() {
        $(this).show();
    });
};


var roomID='UNDEFINED';
var roomName='UNDEFINED';

var send = function(cmd) {

  //console.log("Sending "+cmd);
   
  url="cmd.xml?command="+encodeURIComponent(cmd);
  response = $.ajax({
        type: "GET",
        url: url,
        async: false,
    }).responseText;

  //console.log(response);

  return(response);
}


var loadConfig=function() {
             
              config = $.ajax({
                    type: "GET",
                    url: "config/machine",
                    async: false,
                }).responseText;

              match=config.match(/room=(.*)/);
              if( match!= null ) { roomID=match[1]; };

              match=config.match(/roomName=(.*)/);
              if( match!= null ) { roomName=match[1].replace(/"/g,'') };

              $("#config-roomID").val( roomID );
              $("#config-roomName").val( roomName );
              $("#roomInfo").text( roomID + ' / ' + roomName )
              document.title=roomID;

}


var showVideos=function(item) {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
   
   $.each( ( vlcStatus.result), 
   function(k,v) {
     console.log(v);
   });
  
}

var toggleMedia=function( item ) {

    mediaName=$(item).attr('id').replace('media-','');
    status=send('show '+mediaName);

    action=( status.indexOf('instance') == -1 ) ? 'play' : 'stop';
    status=send('control '+mediaName+' '+action);

    $(item).button("option","label", mediaName+' (<i>stand by</i>)').button("refresh");
    window.setTimeout( 'showMedia()', 3000);

}

var showMedia=function() {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
    
   $.each( ( vlcStatus.result.media || {} ), 
   function(k,v) {

          name=k;
          output=v.output;
          isStream=(output.indexOf('http'));
          
          item=$('#media-'+name);
              
          // Create the button element if needed
          if( !item.exists() ) {

            item=$('<button/>', { id: 'media-'+name, title: name, text:name } )
                 .appendTo('#status-media')
                 .click( function() { toggleMedia( $(this) ) } )
                 .button();
         }
         
         if( v['instances'] ) { 
            if( output.indexOf('http') != -1 ) { showPreview(name) };
            name=name+' (playing)' 
            
         };
          
         item.button("option","label", name).button("refresh");
       
    });

};


var getEvents=function( calendarStart, calendarEnd, callback ) {

   response=send('show schedule');
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
                        allDay:false
                       };
             }

             if(eventType=='start') {
               event['start']=eventLaunch;
             }
             else {
               event['end']=eventLaunch; 
             }             

             events[eventID] = event;

          }                                           

   });
                                                         
  eventsArray=[];
  $.each( events, function(k,v) {
      eventStart=new Date(v.start);
      eventEnd=new Date(v.end);
      
      if( (calendarStart <= eventStart) && ( eventEnd <= calendarEnd ) ) {
       eventsArray.push(v) 
     }

   });

  callback(eventsArray);
}


var handleDelete=function( event, confirmed ) {

 if(!confirmed) {

      courseID=event.courseID;

      content='<div id="deleteOptions">'+
                '<input type="checkbox" id="deleteSingle" value="all"><label for="deleteSingle">Remove this recording only</label>' + 
                '<input type="checkbox" id="deleteAll" value="all"><label for="deleteAll">Remove all scheduled recordings for '+courseID +'</label>' + 
              '</div>';
                
      
      $('<div>').appendTo("body")
               .html( content )
               .data( "event", event )
               .dialog({ title:'Confirm',
                          modal: true,
                          buttons: { 
                                     'Never Mind':function(){ $(this).dialog("close") } ,
                                     'Yes, Delete It':function(){ $(this).dialog("close");handleDelete( $(this).data("event"), true) } 
                                    }
                        });
 }
 else {
  console.log(event);

 }
  
}


var handleHover=function( event, jsEvent, view) {

  switch (jsEvent.type) {

   case 'mouseenter' :

                     toolBar=$('<span>', { class:'hover-toolbar' } );

                     buttonDelete=$('<span>', { id:'delete-'+event.eventID, class:'fa fa-times fa-2x hover-delete' } )
                                  .data("event", event)
                                  .click( function(){ handleDelete( $(this).data("event")) } )
                                  .appendTo(toolBar);
                     
                     $('.fc-event-inner', this).append( toolBar );

                     break;
                     
   case 'mouseleave'  :
                    $('.hover-toolbar', this).remove();
                     break;
 }
 

}

var handleSelect=function( startDate, endDate, allDay, jsEvent, view ) {

  $("#event-calendar").fullCalendar( 'unselect' );
  $("#event-dialog").dialog( "open" );
}



var showPreview=function( mediaName ) {

   previewID='media-'+mediaName+'-preview'

   preview=$('#'+previewID);
   if( !preview.exists() ) {

       var url='http://'+window.location.hostname+':8990/preview';
       var width='640';
       var height='480';

       template =  '<object type="application/x-vlc-plugin" data="'+url+'" width="'+width+'" height="'+height+'" id="'+previewID+'-content" controls="yes">' +
                   ' <param name="movie" value="$url"/>' + 
                   ' <embed type="application/x-vlc-plugin" name="'+previewID+'-content"  autoplay="yes"  loop="no" width="'+width+'" height="'+height+'"  target="'+url+'" />' + 
                  '</object>';

       // Create a modal dialog and throw the preview in it
       $("<div></div>", {id:previewID} )
       .html( template )
       .dialog ({  title : url,
                   width: parseInt(width)+70,
                  height: parseInt(height)+70,
                appendTo: "body",
                   close : function() {  mediaName=$(this).attr('id').split('-')[1]; toggleMedia( $('#media-'+mediaName) ); $(this).dialog("destroy") }
                });                             
  }
 }




 var showIcon=function(icon) {
 
   var link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = './'+icon;
    document.getElementsByTagName('head')[0].appendChild(link);
}



 $(document).ready( function() {  

  
              loadConfig();

              showMedia();
              $("#status-media").buttonset();

              $("#event-dialog").dialog( {autoOpen:false, title:"Scheduler"} );
              
                var date = new Date();
                var d = date.getDate();
                var m = date.getMonth();
                var y = date.getFullYear();
                  $("#event-calendar").fullCalendar( {  events : getEvents,
                                                     header: {  left: 'prev,next today',  center: 'title',  right: 'month,agendaWeek,agendaDay'},
                                                     eventColor : '#ABABAB',
                                                     contentHeight: 500,
                                                     handleWindowResize: true ,
                                                     selectable: true,
                                                     selectHelper: true,
                                                    theme : true,
                                                    year:  y,
                                                    month: m,
                                                    date:  d,                                                     
                                                    defaultView : 'agendaWeek',
                                                    defaultEventMinutes : 15,
                                                    slotMinutes : 15,
                                                    firstHour : 7,
                                                    allDaySlot : false,
                                                    select : handleSelect,
                                                    eventMouseover : handleHover,
                                                    eventMouseout : handleHover
                                                    } );

              $("#content").tabs();

 });




