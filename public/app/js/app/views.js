Backbone.View.prototype.close = function () {
	if (this.beforeClose) {
		this.beforeClose();
	}
	//this.remove();
	//this.unbind();
};


Backbone.View.prototype.garbage = function (view_list) {
	// Trash views that are not currently needed

	// passes in a view_list of things to trash



};


App.Views.Body = Backbone.View.extend({
	
	el: 'body',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	fileUpdate: function(){
		var that = this;

		var view_el = this.$el.find('#files');
		Api.search({
			data: {
				'model' : 'Email',
				'fields' : ['original.headers.To',
							'original.headers.From',
							'original.headers.Subject',
							'original.attachments'],
				'conditions' : {
					"original.attachments" : {"$gt" : {}},
					"original.attachments.type" : { 
						"$nin": [
							'meetup.ics'
							] }
				},
				'sort' : {'common.date_sec' : -1},
				'limit' : 50,
			},
			success: function(response){

				// Parse
				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					console.log('200 not returned');
					return;
				}

				// Parse out the files
				var files = [];
				var j = 0;
				$.each(json.data,function(i,Email){
					$.each(Email.Email.original.attachments,function(k,attachment){
						files[j] = {
							pos: j,
							Email: {
								_id: Email.Email._id,
								original: {
									headers: Email.Email.original.headers
								}
							},
							File: attachment
						};
						j++;
					});
				});

				// Put in global because I don't get models yet
				App.Data.Files = files;

				// Render subview
				if(that.subFiles){
					that.subFiles.close();
				}
				that.subFiles = new App.Views.Files({
					el: view_el,
					files: files
				});
				that.subFiles.render();



				// showView: function(hash,view){
				// 	// Used to discard zombies
				// 	if (!this.currentView){
				// 		this.currentView = {};
				// 	}
				// 	if (this.currentView && this.currentView[hash]){
				// 		this.currentView[hash].close();
				// 	}
				// 	this.currentView[hash] = view.render();
				// },



			}
		});

		return false;
	},

	render: function() {

		var that = this;

		// Data
		// var data = this.options.accounts.UserGmailAccounts;

		// Should start the updater for accounts
		// - have a separate view for Accounts?

		// Template
		var template = App.Utils.template('t_body');

		// Write HTML
		$(this.el).html(template({
			// searches: this.model
		}));

		// Files/Attachments
		this.fileUpdate();

		// Listening
		var draft_event_id = Api.Event.on({
			event: ['Email.new','AppFilemessCollection.update']
		},function(data){
			// Refresh Files
			// console.log(data);
			console.log('updating');
			that.fileUpdate();

			// location.reload(); 
		});

		// Collections
		var view_el2 = this.$el.find('#collections');
		Api.search({
			data: {
				'model' : 'AppFilemessCollection',
				'fields' : [],
				'conditions' : {
				},
				'limit' : 500,
				'sort' : {
					'_id' : -1
				}
			},
			success: function(response){

				// Parse
				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					console.log('200 not returned');
					return;
				}

				// Render subview
				that.subCollections = new App.Views.Collections({
					el: view_el2,
					collections: json.data
				});
				that.subCollections.render();

			}
		});


		return this;
	}
});


App.Views.Files = Backbone.View.extend({
	
	el: 'files',

	events: {
		'click .save' : 'save',
		'click .preview' : 'preview'
	},

	initialize: function(options) {
		_.bindAll(this, 'render');

		// this.el = this.options.el;

	},


	save: function(ev){
		ev.preventDefault;

		var elem = ev.currentTarget;
		
		var File = App.Data.Files[$(elem).parents('li.item').attr('data-pos')];

		filepicker.exportFile(
			'https://s3.amazonaws.com/emailboxv1/' + File.File.path,
			{mimetype:File.File.type},
			function(FPFile){
				console.log(FPFile.url);
			});

		return false;
	},

	preview: function(ev){
		// Display a preview (if it is an image)
		var elem = ev.currentTarget;
		var $item = $(elem).parents('.item');

		// Get File
		var File = App.Data.Files[$(elem).parents('li.item').attr('data-pos')];

		// Handle toggling
		if($item.hasClass('previewing')){
			// Already showing it
			// - slideup
			$(elem).removeClass('btn-primary');
			$item.removeClass('previewing');
			$item.find('.preview_file').remove();

		} else {
			// Show the preview (if it is an image)
			$(elem).addClass('btn-primary');
			$item.addClass('previewing');

			// Append after this item
			var template = App.Utils.template('t_preview_file');
			// console.log(File);
			$item.append(template(File));
			$item.find('.preview_file').fadeIn('fast');
		}

		return false;

	},


	render: function() {
		var that = this;
		// Data
		// var data = this.options.accounts.UserGmailAccounts;

		// Should start the updater for accounts
		// - have a separate view for Accounts?

		// Template
		var template = App.Utils.template('t_files');

		// Write HTML
		// No idea why "this.el" doesn't fucking exist
		$(this.el).html(template(this.options.files));

		// Kick off fetcher
		// App.Plugins.Attached.start();

		$("ul#file_list").selectable();
		$("ul#file_list li").click(function(){
			if( !$(this).hasClass("ui-selected")){
				$(this).addClass("ui-selected")
				if(!App.Data.Keys.shift && !App.Data.Keys.meta){
					$(this).siblings().removeClass("ui-selected");
				}
			} else {
				if(!App.Data.Keys.shift && !App.Data.Keys.meta){
					$(this).siblings().removeClass("ui-selected");
				}
			}
		});
		$("ul#file_list li").draggable({
			appendTo: "body",
			helper: "clone",
			start: function(ev, ui) {        
				if( $(this).hasClass("ui-selected")) {
					// Great, just continue dragging

				} else {
					if(!App.Data.Keys.shift && !App.Data.Keys.meta){
						$(this).addClass("ui-selected").siblings().removeClass("ui-selected");
					} else {
						$(this).addClass("ui-selected");
					}
				}
			}
		});

		// Resize window
		var oTop = $('#file_list').offset().top;
		var viewportHeight = $(window).height();
		$('#file_list').height(viewportHeight - oTop - 1 + 'px');
		
		return this;
	}
});


App.Views.Collections = Backbone.View.extend({
	
	el: 'collections',

	events: {
		'click .remove' : 'remove',
		'click .title' : 'title',
		'click .new_collection' : 'new_collection'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	new_collection: function(ev){
		var that = this;

		var k = prompt('https://attached.emailbox.com/your_text_here');
		if(k == null){
			return false;
		}

		// Try and create the new URL
		var createUrlData = {
			key: k.toLowerCase()
		};

		$.ajax({
			url: '/api/url/create',
			type: 'POST',
			cache: false,
			data: JSON.stringify(createUrlData),
			// dataType: 'html',
			headers: {"Content-Type" : "application/json"},
			success: function(jData){
				// Result via Filemess server
				// - sets cookie
				if(jData.code != 200){
					// Failed creating url key
					alert('Sorry, that was already taken');
					that.new_collection(ev);
					return;
				}

				var newCollection = {
					key: createUrlData.key,
					title: '',
					files: []
				};

				// Saved
				// - create new AppFilemessCollection object
				Api.write({
					data: {
						model: "AppFilemessCollection",
						event: "AppFilemessCollection.new",
						obj: newCollection
					},
					success: function(res){
						var jData = JSON.parse(res);

						if(jData.code != 200){
							// Shit failed, writing
							console.log('Failed to write Collection');
							return;
						}
						newCollection._id = jData.data._id;

						// Get the google short url
						var url = 'https://www.googleapis.com/urlshortener/v1/url?key=' + App.Credentials.google_api_key;
						$.ajax({
							url: url,
							type: 'POST',
							cache: false,
							headers: {"Content-Type" : "application/json"},
							data: JSON.stringify({
								longUrl: App.Credentials.base_local_url + '/' + newCollection.key
							}),
							dataType: 'json',
							success: function(response){
								if(response.id){
									var short_link = response.id;
									Api.update({
										data: {
											model: 'AppFilemessCollection',
											id: newCollection._id,
											paths: {
												'$set' : {
													'short_link' : short_link
												}
											}	
										},
										success: function(){
											console.log('Created short_url: ' + short_link);
										}
									});
								}
							}
						});

						// Write new collection in front of new_collection
						var template = App.Utils.template('t_collection_in_collection_parent');
						$(that.el).find('.collection_list').prepend(template({AppFilemessCollection: newCollection}));

						that.droppable();
					}
				});

				// Backbone.history.loadUrl('body');
				
			}
		});

		return false;
	},

	title: function(ev){
		// Change the title
		var elem = ev.currentTarget;

		var $collection = $(elem).parents('.collection');
		var collection_id = $collection.attr('data-collection-id')

		var newTitle = prompt('Public Title of Collection',$.trim($(elem).text()));
		if(newTitle == null){
			return false;
		}

		// Update collection
		Api.update({
			data: {
				model: 'AppFilemessCollection',
				id: collection_id,
				paths: {
					"$set" : {
						"title" : newTitle
					}
				}
			},
			success: function(res){

				res = JSON.parse(res);

				if(res.code != 200){
					return false;
				}

				$(elem).text(newTitle);

			}
		});

		return false;

	},

	remove: function(ev){
		// Remove a file from a collection
		var elem = ev.currentTarget;

		// Get the position of this item in the collection
		var pos = $(elem).parents('.file').attr('data-pos');

		var paths = {'$unset' : {}};
		paths['$unset']['files.' + pos.toString()] = 1;
		// console.log(paths);
		var $collection = $(elem).parents('.collection');
		var collection_id = $collection.attr('data-collection-id')

		// Get collection
		var that = this;

		// $unset
		Api.update({
			data: {
				model: 'AppFilemessCollection',
				id: collection_id,
				paths: paths
			},
			success: function(res){

				// $pull
				Api.update({
					data: {
						model: 'AppFilemessCollection',
						id: collection_id,
						paths: {
							'$pull' : {'files' : null}
						}
					},
					success: function(res){

						// search and update collection

						Api.search({
							data: {
								model: 'AppFilemessCollection',
								conditions: {'_id' : collection_id},
								fields: [],
								limit: 1
							},
							success: function(res){
								var res = JSON.parse(res);
								if(res.code != 200){
									console.log('Failed finding collection to drop into (1)');
									return;
								}

								if(res.data.length != 1){
									console.log('Failed finding collection to drop into (2)');
									return;
								}

								// Get collection
								var collection = res.data[0];

								var template = App.Utils.template('t_collection_in_collection');
								$(that.el).find('.collection[data-collection-id="'+collection_id+'"]').html(template(collection));

							}
						});

					}
				});

			}
		});

		$(elem).parents('.file').remove();

		if($collection.find('.files div').length < 1){
			var template = App.Utils.template('t_no_files');
			$collection.find('.files').html(template());
		}

		return false;
	},

	droppable: function(){
		var that = this;

		$('.collection').droppable({
			activeClass: "ui-state-default",
			hoverClass: "ui-state-hover",
			accept: ":not(.ui-sortable-helper)",
			tolerance: 'pointer',
			drop: function( event, ui ) {
				// console.log(event);
				// console.log(ui);

				// Get dropped file from global datastore
				var copying_files = $('#file_list .item.ui-selected');

				// Get the collection we were dropped in
				var collection_id = $(this).attr('data-collection-id');
				Api.search({
					data: {
						model: 'AppFilemessCollection',
						conditions: {'_id' : collection_id},
						fields: [],
						limit: 1
					},
					success: function(res){
						var res = JSON.parse(res);
						if(res.code != 200){
							console.log('Failed finding collection to drop into (1)');
							return;
						}

						if(res.data.length != 1){
							console.log('Failed finding collection to drop into (2)');
							return;
						}

						var collection = res.data[0];

						// Got collection

						// Get Files we are trying to move over

						var DroppedFiles = [];
						$.each(copying_files,function(i,v){
							var pos = $(v).attr('data-pos');
							DroppedFiles.push(App.Data.Files[pos]);
						});

						// See if dropped attachment already exists
						$.each(DroppedFiles,function(k,DroppedFile){
							var found = false;
							$.each(collection.AppFilemessCollection.files,function(i,file){
								if(file.attachment.path == DroppedFile.File.path){
									// Discard this guy
									found = true;
								}
							});
							if(found){
								console.log('Already found in collection');
								DroppedFiles.splice(k,1);
							}
						});

						// Any left to add?
						if(DroppedFiles.length < 1){
							return;
						}

						$.each(DroppedFiles,function(i,DroppedFile){
							collection.AppFilemessCollection.files.push({
								attachment: DroppedFile.File,
								note: DroppedFile.Email.original.headers.Subject
							});
						});

						var index = collection.AppFilemessCollection.files.length - 1;

						// Not added
						// - add it
						console.log('Updating AppFilemessCollection');
						Api.update({
							data: {
								model: 'AppFilemessCollection',
								id: collection_id,
								paths: {
									'$set' : {
										'files' : collection.AppFilemessCollection.files
									}
								}
							},
							success: function(res){
								// Add
								console.log('Successfully updated collection');
								var template = App.Utils.template('t_collection_in_collection');
								$(that.el).find('.collection[data-collection-id="'+collection_id+'"]').html(template(collection));
							}
						});

					}
				});

				// See if it already is in there


				// Add it to the collection


				// {
				//     "model": "AppFilemessCollection",
				//     "id": "50c566b63ea98eff20000044",
				//     "event" : "updated",
				//     "paths": {
				//         "$push": {
				//             "files": {
				//                 "attachment": {
				//                     "path": "2012/12-10/72d64ea6-4282-11e2-a71b-12314101160c/nickle.ppt",
				//                     "name_base64": "bmlja2xlLnBwdA==.ppt",
				//                     "type": "application/vnd.ms-powerpoint",
				//                     "name": "nickle.ppt",
				//                     "size": 198656
				//                 },
				//                 "note" : "first note"

				//             }
				//         }}


				// }

			}
		});

	},

	render: function() {

		var that = this;

		// Data
		// var data = this.options.accounts.UserGmailAccounts;

		// Should start the updater for accounts
		// - have a separate view for Accounts?

		// Template
		var template = App.Utils.template('t_collections');

		// Write HTML
		// No idea why "this.el" doesn't fucking exist
		$(this.el).html(template(this.options.collections));

		this.droppable();

		// Resize with collections
		var oTop = $('.collection_list').offset().top;
		var viewportHeight = $(window).height();
		$('.collection_list').height(viewportHeight - oTop - 1 + 'px');

		return this;
	}
});



App.Views.BodyLogin = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click button' : 'login', // composing new email,

	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	login: function(ev){
		// Start OAuth process

		var p = {
			response_type: 'token',
			client_id : App.Credentials.app_key,
			redirect_uri : [location.protocol, '//', location.host, location.pathname].join('')
			// state // optional
			// x_user_id // optional    
		};
		var params = $.param(p);

		window.location = App.Credentials.base_login_url + "/apps/authorize/?" + params;


		return false;

	},

	render: function() {

		var template = App.Utils.template('t_body_login');

		// Write HTML
		$(this.el).html(template());

		return this;
	}
});


App.Views.Modal = Backbone.View.extend({
	
	el: 'body',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	render: function() {

		// Remove any previous version
		$('#modalIntro').remove();

		// Build from template
		var template = App.Utils.template('t_modal_intro');

		// Write HTML
		$(this.el).append(template());

		// Display Modal
		$('#modalIntro').modal();

		return this;
	}

});


App.Views.Toast = Backbone.View.extend({
	
	id: 'toast',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	render: function() {
		var that = this;
		// Remove any previous version
		// $('#toast').remove();

		// Build from template
		var template = App.Utils.template('t_toast');

		// Write HTML
		this.$el.html(template({
			message: this.options.message
		}));

		// Add classname
		if(this.options.type){
			this.$el.addClass('toast-' + this.options.type);
		}

		$('body').append(this.el);
		// $(this.el).append(template({
		//  message: this.options.message
		// }));

		this.$el.animate({
			opacity: 1
		},'fast');

		// Display Modal
		window.setTimeout(function(){
			that.$el.animate({
				opacity: 0
			},'fast',function(){
				// $(this).remove();
				that.close();
			});
		},3000);

		return this;
	}

});


App.Views.OnlineStatus = Backbone.View.extend({
	
	className: 'online-status nodisplay',

	events: {},

	initialize: function() {
		_.bindAll(this, 'render');

		// Render it

		// display is on or off

		this.on('online',this.hide,this);
		this.on('offline',this.show,this);
	},

	show: function(){
		this.$el.removeClass('nodisplay');
	},

	hide: function(){
		// Add nodisplay
		this.$el.addClass('nodisplay');
	},

	render: function() {

		// Add to page

		// Build from template
		var template = App.Utils.template('t_online_status');

		// Write HTML
		// - to body
		this.$el.html(template());
		$('body').append(this.$el);

		return this;
	}

});


App.Views.DebugMessages = Backbone.View.extend({
	
	el: 'body',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
		// _.bindAll(this, 're_render');
		// _.bindAll(this, 'render');

		// Bind to new debug message events
		App.Events.bind('debug_messages_update',this.render);

	},

	render: function() {

		// Remove any previous version
		$('#debug-messages').remove();

		// Get debug messages
		// - already in App.Data.debug_messages

		// Get data and sort it
		// - sort by date
		// - newest item is at the bottom?
		var data = $.extend({},App.Data.debug_messages);
		data = App.Utils.sortBy({
			arr: data,
			path: 'datetime',
			direction: 'asc',
			type: 'date'
		});

		// Displaying debug output, or just a "refreshing" thing? 

		// Build from template
		var template;
		if(1==0){
			template = App.Utils.template('t_debug_messages');
		} else {
			template = App.Utils.template('t_debug_messages_production');
		}

		// Write HTML
		$(this.el).prepend(template(App.Data.debug_messages));

		// timeago
		// - crude
		// this.$('.timeago').timeago();
		
		return this;
	}

});

