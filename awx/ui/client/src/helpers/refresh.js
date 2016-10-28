/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

    /**
 * @ngdoc function
 * @name helpers.function:refresh
 * @description
 *  RefreshHelper
 *
 *  Used to refresh a related set whenever pagination or filter options change.
 *
 *  RefreshRelated({
 *      scope: <current scope>,
 *      set: <model>,
 *      iterator: <model name in singular form (i.e. organization),
 *      url: <the api url to call>
 *      });
 *
 */


export default
    angular.module('RefreshHelper', ['RestServices', 'Utilities', 'PaginationHelpers'])
        .factory('Refresh', ['$rootScope', '$location', 'ProcessErrors', 'Rest', 'Wait', 'Empty', 'PageRangeSetup', 'pagination', function ($rootScope, $location, ProcessErrors, Rest, Wait, Empty, PageRangeSetup, pagination) {
        return function (params) {

            var scope = params.scope,
                set = params.set,
                iterator = params.iterator,
                deferWaitStop = params.deferWaitStop;

            var getPage = function(url) {
                scope.current_url = url;

                Rest.setUrl(url);
                Rest.get()
                    .success(function (data) {
                        var i, modifier;
                        PageRangeSetup({
                            scope: scope,
                            count: data.count,
                            next: data.next,
                            previous: data.previous,
                            iterator: iterator
                        });
                        for (i = 1; i <= 3; i++) {
                            modifier = (i === 1) ? '' : i;
                            scope[iterator + 'HoldInput' + modifier] = false;
                        }
                        scope[set] = data.results;
                        scope[iterator + 'Loading'] = false;
                        scope[iterator + 'HidePaginator'] = false;
                        if (!deferWaitStop) {
                            Wait('stop');
                        }
                        scope.$emit('PostRefresh', set);
                    })
                    .error(function (data, status) {
                        scope[iterator + 'HoldInput'] = false;
                        ProcessErrors(scope, data, status, null, {
                            hdr: 'Error!',
                            msg: 'Failed to retrieve ' + set + '. GET returned status: ' + status
                        });
                    });
            };

            var id, restUrl, pageSize;

            // if you're editing an object, make sure you're on the right
            // page to display the element you are editing
            if (params.fromSearch) {
                var url = params.url;
                // for a search, we want to make sure to get the first page of
                // results
                if (url.indexOf("page=") > -1) {
                    // if the url includes a page, remove that part
                    var urlArr = url.split("page=");
                    var afterPageUrlArr = urlArr[1].split("&");

                    if (afterPageUrlArr.length > 1) {
                        // if there's stuff after the page part,
                        // put that back in
                        afterPageUrlArr.shift();
                        url = urlArr[0] +
                            afterPageUrlArr.join("&");
                    } else {
                        url = urlArr[0];
                    }
                }
                getPage(url);
            } else if (scope.addedItem) {
                id = scope.addedItem + "";
                delete scope.addedItem;
                $rootScope.rowBeingEdited = id;
                $rootScope.listBeingEdited = set;
                $rootScope.addedAnItem = true;
                restUrl = params.url.split("?")[0];
                pageSize = scope[iterator + '_page_size'];
                pagination.getInitialPageForList(id, restUrl, pageSize)
                    .then(function (currentPage) {
                        scope.getPage(currentPage, set, iterator);
                    });
            } else if ($location.$$url.split("/")[1] === params.set && $location.$$url.split("/")[2] && $location.$$url.split("/")[2] !== "add" && !scope.getNewPage) {
                id = $location.$$url.split("/")[2];
                restUrl = params.url.split("?")[0];
                pageSize = scope[iterator + '_page_size'];
                pagination.getInitialPageForList(id, restUrl, pageSize)
                    .then(function (currentPage) {
                        scope[iterator + '_page'] = currentPage;
                        params.url = params.url + "&page=" + currentPage;
                        getPage(params.url);

                    });
            } else {
                getPage(params.url);
            }
        };


    }
]);
