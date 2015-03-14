var Albums = {
	init: function( config ) {
		this.config = config;
		this.setupTemplates();
		this.bindEvents();
	},

	bindEvents: function() {
		var self = Albums;

		$( document ).ready( this.getArtists );
		
		$( document ).on('artistsFetched', function(e) {
			self.showArtists(self.config, e.ajaxResult);
			$('div[data-id="artist"]').on('click', self.getAlbums);
		});

		$( document ).on('albumsFetched', function(e) {
			self.showAlbums(e.ajaxResult, 
							e.albumsContainer,
							e.allAlbumContainers,
							e.albumsAreVisible);
		});

		$( document ).on('errorFetchingArtists', function(e) {
			$('ul#artistsContainer').append('<li><div class="artistError">Error fetching the artists</div><div class="albumsContainer"></div></li>');
		});

		$( document ).on('errorFetchingAlbums', function(e) {
			e.albumsContainer.append('<div class="albumError" data-id="albumError"><div class="albumTitle">Error fetching the albums</div></div>');
			$('*[data-id="albumsContainer"]').show();
		});

		$( document ).on('errorSavingRating', function(e) {
			if ( !e.albumsContainer.find('[data-id="albumError"]').length ) {
				e.albumsContainer.append('<div class="albumError" data-id="albumError"><div class="albumTitle">Error saving a rating</div></div>');
			}
		});

		$( document ).on('albumRatingSaved', function(e) {
			var albumContainer = e.albumsContainer.find('div[data-album-id="' + e.album.AlbumId + '"]');

			self.setStarsColor(albumContainer, e.album, e.rating);

			self.updateAlbumRatingDetails(albumContainer, e.album);
		});

		$( document ).on('albumRatingFetched', function(e) {
			e.albumContainer.find('[data-id="cantRatings"]').text(e.album.CantRatings);
			e.albumContainer.find('[data-id="averageRating"]').text(e.album.AverageRating);
		});
	},

	setupTemplates: function() {
		this.config.artistTemplate = Handlebars.compile(this.config.artistTemplate);
		this.config.albumTemplate = Handlebars.compile(this.config.albumTemplate);
	},

	getArtists: function() {
		var self = Albums;

		return $.ajax({
			url: self.config.getArtistsUrl,
			type: 'GET',
			dataType: 'json',
			success: function ( result ) {
				$.event.trigger({
					type: "artistsFetched",
					ajaxResult: result});
			},
			error: function() {
				$.event.trigger({ type: "errorFetchingArtists" });
			},
		});
	},

	showArtists: function( config, artists ) {
		config.artistsContainer.append(config.artistTemplate(artists));
	},

	getAlbums: function() {
		var self = Albums,
			li = $(this).parent(),
			artistId = li.data("artist-id"),
			albumsContainer = li.find('[data-id="albumsContainer"]'),
			allAlbumContainers = $('li div[data-id="albumsContainer"]'),
			albumsAreLoaded = ($(li).find('[data-id="album"]').length > 0),
			albumsAreVisible = albumsContainer.is(":visible");

		if (!albumsAreLoaded)
		{
			$.ajax({
				url: self.config.getAlbumsFromArtistUrl + artistId,
				type: 'GET',
				dataType: 'json',
				success: function( result ) {
					$.event.trigger({
						type: "albumsFetched",
						ajaxResult: result,
						albumsContainer: albumsContainer,
						allAlbumContainers: allAlbumContainers,
						albumsAreVisible: albumsAreVisible,
					});
				},
				error: function() {
					$.event.trigger({
						type: "errorFetchingAlbums",
						albumsContainer: albumsContainer,
					});
				},
			});

			return;
		}

		self.setAlbumsVisibility(allAlbumContainers, 
								 albumsContainer, 
								 albumsAreVisible);
	},

	showAlbums: function(albums, albumsContainer, allAlbumContainers, albumsAreVisible) {
		var self = Albums;

		albumsContainer.append(self.config.albumTemplate(albums));

		self.setAlbumsRatingDetails(albums, albumsContainer);

		albumsContainer.find('[data-id="starsContainer"] img').on('click', function() {
			self.saveAlbumsRating(this, albums, albumsContainer);
		});

		self.setAlbumsVisibility(allAlbumContainers, 
								 albumsContainer, 
								 albumsAreVisible);
	},

	setAlbumsRatingDetails: function( albums, albumsContainer ) {
		var self = Albums;

		albums.forEach( function( album, index ) {

			var rating = Math.round(album.AverageRating);

			for (var i = 1; i <= rating; i++) {
    			var albumContainer = albumsContainer.find('div[data-album-id="' + album.AlbumId + '"]'),
    				starImage = albumContainer.find('img[data-position="' + i + '"]');

    			starImage[0].src = "images/star-read.png";
			};
		});
	},

	saveAlbumsRating: function( starImg, albums, albumsContainer ) {
		var self = Albums,
			albumId = $(starImg).data('album-id'),
			rating = $(starImg).data('position'),
			album = $.grep(albums, function( e ) { return e.AlbumId == albumId; })[0];

		$.ajax({
		  url: self.config.saveRatingForAlbumUrl.replace('{{albumId}}', albumId)
		  										.replace('{{rating}}', rating),
		  type: 'POST',
		  dataType: 'json',
		  success: function( result ) {
		  	if ( result ) {
				$.event.trigger({
					type: "albumRatingSaved",
					albumsContainer: albumsContainer,
					album: album,
					rating: rating,
				});
		  	}
			else
		  	{
				$.event.trigger({
					type: "errorSavingRating",
					albumsContainer: albumsContainer,
				});
		  	};
		  },
		  error: function() {
			$.event.trigger({
				type: "errorSavingRating",
				albumsContainer: albumsContainer,
			});
		  },
		});
	},

	setStarsColor: function( albumContainer, album, rating ) {
		var self = Albums,
			stars = albumContainer.find('div[data-id="starsContainer"] img');

		stars.fadeOut(self.config.animationSpeed).promise().done(function() {

			for (var i = 1; i <= 5; i++) {
		    		var starImage = albumContainer.find('img[data-position="' + i + '"]')[0];

		    		starImage.src = ( i <= rating ) ? "images/star-rated.png" : "images/star-off.png";
			};

			stars.fadeIn(self.config.animationSpeed);
		});
	},

	setAlbumsVisibility: function( allAlbumContainers, albumsContainer, albumsAreVisible ) {
		var self = Albums;

		allAlbumContainers.slideUp(self.config.animationSpeed).promise().done(function() {
			if (!albumsAreVisible) {
				albumsContainer.slideToggle(self.config.animationSpeed);
			}
		});
	},

	updateAlbumRatingDetails: function( albumContainer, album ) {
		var self = Albums;

		$.ajax({
			url: self.config.getAlbumByIdUrl.replace('{{albumId}}', album.AlbumId),
			type: 'GET',
			dataType: 'json',
			success: function ( result ) {
				$.event.trigger({
					type: "albumRatingFetched",
					album: result,
					albumContainer: albumContainer,
				});
			},
			error: function() {
				$.event.trigger({ type: "errorSavingRating" });
			},
		});
	},
};

Albums.init({
	artistTemplate: $('#artistTemplate').html(),
	albumTemplate: $('#albumTemplate').html(),
	artistsContainer: $('ul#artistsContainer'),
	animationSpeed: 100,
	getArtistsUrl: 'http://windows:8080/AlbumReviewer/GetArtists',
	getAlbumsFromArtistUrl: 'http://windows:8080/AlbumReviewer/GetAlbumsFromArtist/',
	saveRatingForAlbumUrl: 'http://windows:8080/AlbumReviewer/SaveRatingForAlbum/{{albumId}}/rating/{{rating}}',
	getAlbumByIdUrl: 'http://windows:8080/AlbumReviewer/GetAlbumById/{{albumId}}',
});