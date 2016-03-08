angular.module('ui.bootstrap.contextMenu', [])

.directive('contextMenu', ["$parse", "$q", "$window", function ($parse, $q, $window) {

    var contextMenus = [];

    var removeContextMenus = function (level) {
        while (contextMenus.length && (!level || contextMenus.length > level)) {
            contextMenus.pop().remove();
        }
        if (contextMenus.length == 0 && $currentContextMenu) {
            $currentContextMenu.remove();
        }
    };

    var $currentContextMenu = null;

    var renderContextMenu = function ($scope, event, options, model, level) {
        if (!level) { level = 0; }
        if (!$) { var $ = angular.element; }
        $(event.currentTarget).addClass('context');
        var $contextMenu = $('<div>');
        if ($currentContextMenu) {
            $contextMenu = $currentContextMenu;
        } else {
            $currentContextMenu = $contextMenu;
        }
        $contextMenu.addClass('dropdown clearfix');
        var $ul = $('<ul>');
        $ul.addClass('dropdown-menu');
        $ul.attr({ 'role': 'menu' });
        $ul.css({
            display: 'block',
            position: 'absolute',
            left: event.pageX + 'px',
            top: event.pageY + 'px',
            "z-index": 10000,
            margin: 0
        });

        var $promises = [];
        angular.forEach(options, function (item, i) {
            var $li = $('<li>');
            if (item === null) {
                $li.addClass('divider');
            } else {
                var nestedMenu = angular.isArray(item[1])
                  ? item[1] : angular.isArray(item[2])
                  ? item[2] : angular.isArray(item[3])
                  ? item[3] : null;
                var $a = $('<a>');
                $a.css("padding-right", "8px");
                $a.attr({ tabindex: '-1', href: '#' });
                var text = typeof item[0] == 'string' ? item[0] : item[0].call($scope, $scope, event, model);
                $promise = $q.when(text);
                $promises.push($promise);
                $promise.then(function (text) {
                    if (nestedMenu) {
                        $a.css("cursor", "default");
                        $a.append($('<strong style="font-family:monospace;font-weight:bold;float:right;">&gt;</strong>'));
                    }
                    $a.append(text);
                });
                $li.append($a);

                var enabled = angular.isFunction(item[2]) ? item[2].call($scope, $scope, event, model, text) : true;
                if (enabled) {

                    var openNestedMenu = function ($event) {
                        removeContextMenus(level + 1);
                        renderContextMenu($scope, $event, nestedMenu, model, level + 1);
                    };

                    $li.on('click', function ($event) {
                        $event.preventDefault();
                        $scope.$apply(function () {
                            if (nestedMenu) {
                                openNestedMenu($event);
                            } else {
                                $(event.currentTarget).removeClass('context');
                                removeContextMenus();
                                item[1].call($scope, $scope, event, model, text);
                            }
                        });
                    });

                    $li.on('mouseover', function ($event) {
                        $scope.$apply(function () {
                            if (nestedMenu) {
                                openNestedMenu($event);
                            }
                        });
                    });
                } else {
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                    });
                    $li.addClass('disabled');
                }
            }
            $ul.append($li);
        });
        $contextMenu.append($ul);
        var height = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        $contextMenu.css({
            width: '100%',
            height: height + 'px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999
        });
        $(document).find('body').append($contextMenu);



        //calculate if drop down menu would go out of screen at left or bottom
        // calculation need to be done after element has been added (and all texts are set; thus thepromises)
        // to the DOM the get the actual height
        $q.all($promises).then(function(){

            var menu = $ul[0];

            var offsetX = $window.pageXOffset;
            var offsetY = $window.pageYOffset;

            var menuWidth = menu.offsetWidth;
            var menuHeight = menu.offsetHeight;

            var windowWidth = $window.innerWidth;
            var windowHeight = $window.innerHeight;

            // calculate possible positions
            var positionRight = event.clientX;
            var positionLeft = event.clientX - menuWidth;
            var positionDown = event.clientY;
            var positionUp = event.clientY - menuHeight;
            if( level > 0 ) {
                var parentMenu = contextMenus[level-1][0];
                var parentMenuItem = event.currentTarget;

                positionRight = parentMenu.offsetLeft - offsetX + parentMenu.offsetWidth -1;
                positionLeft = positionRight - parentMenu.offsetWidth - menuWidth +2;

                positionDown = parentMenu.offsetTop - offsetY + parentMenuItem.offsetTop;
                positionUp = positionDown + parentMenuItem.offsetHeight - menuHeight +7; // the 7 comes from the border + 2* margins of menu, I guess
            }


            // FIX HORIZONTAL POSITION

            var menuX = positionRight;

            // fit menu below
            if(positionRight + menuWidth <= windowWidth) {
                menuX = positionRight;

            // fit menu above
            } else if(positionLeft >= 0) {
                menuX = positionLeft;

            // fit menu on right of window
            } else if(menuWidth < windowWidth){
                menuX = windowWidth - menuWidth;
            }


            // FIX VERTICAL POSITION

            // default to below
            var menuY = positionDown;

            // fit menu below
            if(positionDown + menuHeight <= windowHeight) {
                menuY = positionDown;

            // fit menu above
            } else if(positionUp >= 0) {
                menuY = positionUp;

            // fit menu on bottom of window
            } else if(menuHeight < windowHeight){
                menuY = windowHeight - menuHeight;
            }


            // update with new coords
            $ul.css({
                display: 'block',
                position: 'absolute',
                left: offsetX + menuX + 'px', // back to pagecoords!
                top: offsetY + menuY + 'px'   // back to pagecoords!
            });

        });



        $contextMenu.on("mousedown", function (e) {
            if ($(e.target).hasClass('dropdown')) {
                $(event.currentTarget).removeClass('context');
                removeContextMenus();
            }
        }).on('contextmenu', function (event) {
            $(event.currentTarget).removeClass('context');
            event.preventDefault();
            removeContextMenus(level);
        });
        $scope.$on("$destroy", function () {
            removeContextMenus();
        });

        contextMenus.push($ul);
    };
    return function ($scope, element, attrs) {
        triggerOn = attrs.hasOwnProperty('contextMenuLeft') ? "click":"contextmenu";

        element.on(triggerOn, function (event) {
            event.stopPropagation();
            $scope.$apply(function () {
                event.preventDefault();
                var options = $scope.$eval(attrs.contextMenu);
                var model = $scope.$eval(attrs.model);
                if (options instanceof Array) {
                    if (options.length === 0) { return; }
                    renderContextMenu($scope, event, options, model);
                } else {
                    throw '"' + attrs.contextMenu + '" not an array';
                }
            });
        });
    };
}]);
