$(document).ready(function() {
    var excludeDomains = []; // Array to hold the domains to exclude

    var table = $('#seoDataTable').DataTable({
        processing: true,
        serverSide: true,
        paging: true,
        searching: true,
        order: [[1, "asc"]],
        ajax: {
            url: "/api/data",
            type: 'GET',
            data: function(d) {
                // Custom filtering parameters
                d.excludeDomains = excludeDomains;
                d.rdMin = $('#rdMin').val();
                d.rdMax = $('#rdMax').val();
                d.drMin = $('#drMin').val();
                d.drMax = $('#drMax').val();
                d.trafficMin = $('#trafficMin').val();
                d.trafficMax = $('#trafficMax').val();
                d.clientUrl = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(0).val();
                d.rootDomain = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(1).val();
                d.anchor = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(2).val();
                d.niche = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(3).val();
                d.placedLink = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(4).val();
                d.placedOn = $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(5).val();
                d.export_all = 'false';
            },
            dataSrc: function(json) {
                return json.data;
            }
        },
        columns: [
            {
                data: "uploaddate",
                render: function(data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        var date = new Date(data); 
                        var day = String(date.getDate()).padStart(2, '0');
                        var month = String(date.getMonth() + 1).padStart(2, '0'); 
                        var year = date.getFullYear();
                        return day + '/' + month + '/' + year;
                    }
                    return data; 
                }
            },
            {
                data: "clienturl",
                render: function(data, type, row) {
                    if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
                        return '<a href="' + data + '" target="_blank">' + data + '</a>';
                    } else {
                        return data;
                    }
                }
            },
            { data: "rootdomain" },
            { data: "anchor" },
            { data: "niche" },
            { data: "rd" },
            { data: "dr" },
            { data: "traffic" },
            {
                data: "placedlink",
                render: function(data, type, row) {
                    if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
                        return '<a href="' + data + '" target="_blank">' + data + '</a>';
                    } else {
                        return data;
                    }
                }
            },
            { data: "placedon" }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excelHtml5',
                title: null,
                filename: function() {
                    var date = new Date();
                    var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                    return dateString + '-Seo-data';
                },
                action: function ( e, dt, button, config ) {
                    // Fetch all data
                    var filters = {
                        excludeDomains: excludeDomains,
                        rdMin: $('#rdMin').val(),
                        rdMax: $('#rdMax').val(),
                        drMin: $('#drMin').val(),
                        drMax: $('#drMax').val(),
                        trafficMin: $('#trafficMin').val(),
                        trafficMax: $('#trafficMax').val(),
                        clientUrl: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(0).val(),
                        rootDomain: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(1).val(),
                        anchor: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(2).val(),
                        niche: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(3).val(),
                        placedLink: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(4).val(),
                        placedOn: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(5).val(),
                        export_all: 'true'
                    };
            
                    $.ajax({
                        url: '/api/data',
                        type: 'GET',
                        data: filters,
                        success: function(response) {
                            var data = response.data.map(row => [
                                row.uploaddate,
                                row.clienturl,
                                row.rootdomain,
                                row.anchor,
                                row.niche,
                                row.rd,
                                row.dr,
                                row.traffic,
                                row.placedlink,
                                row.placedon
                            ]);
            
                            var headers = [
                                'Date', 'Client URL', 'Root Domain', 'Anchor', 'Niche', 'RD', 'DR', 'Traffic', 'Placed Link', 'Placed On'
                            ];
            
                            var wb = XLSX.utils.book_new();
                            var ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
                            XLSX.utils.book_append_sheet(wb, ws, 'SEO Data');
            
                            var date = new Date();
                            var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                            XLSX.writeFile(wb, dateString + '-Seo-data.xlsx');
                        },
                        error: function() {
                            alert('Failed to export data to Excel.');
                        }
                    });
                }
            },
            {
                extend: 'csvHtml5',
                title: null,
                filename: function() {
                    var date = new Date();
                    var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                    return dateString + '-Seo-data';
                },
                action: function ( e, dt, button, config ) {
                    // Fetch all data
                    var filters = {
                        excludeDomains: excludeDomains,
                        rdMin: $('#rdMin').val(),
                        rdMax: $('#rdMax').val(),
                        drMin: $('#drMin').val(),
                        drMax: $('#drMax').val(),
                        trafficMin: $('#trafficMin').val(),
                        trafficMax: $('#trafficMax').val(),
                        clientUrl: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(0).val(),
                        rootDomain: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(1).val(),
                        anchor: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(2).val(),
                        niche: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(3).val(),
                        placedLink: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(4).val(),
                        placedOn: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(5).val(),
                        export_all: 'true'
                    };

                    $.ajax({
                        url: '/api/data',
                        type: 'GET',
                        data: filters,
                        success: function(response) {
                            var data = response.data.map(row => [
                                row.uploaddate,
                                row.clienturl,
                                row.rootdomain,
                                row.anchor,
                                row.niche,
                                row.rd,
                                row.dr,
                                row.traffic,
                                row.placedlink,
                                row.placedon
                            ]);

                            var headers = 'Date,Client URL,Root Domain,Anchor,Niche,RD,DR,Traffic,Placed Link,Placed On\n';
                            var csv = headers + data.map(row => row.join(',')).join('\n');

                            var date = new Date();
                            var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                            var filename = dateString + '-Seo-data.csv';

                            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            var link = document.createElement('a');
                            if (link.download !== undefined) {
                                var url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', filename);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                        }
                    });
                }
            }
        ]
    });

   // Handle domain exclusion form submission
    $('#domainExclusionMaterialForm').on('submit', function(e) {
        e.preventDefault();
        excludeDomains = $('#domainFilter').val().toLowerCase().split('\n').map(domain => domain.trim());
        
        console.log("Excluding domains:", excludeDomains); // Log the excluded domains for debugging
        
        table.draw(); // Trigger a redraw to apply the new exclusion filter
    });

    // Reset button functionality
    $('#resetButton').click(function() {
        $('#domainFilter').val('');  // Clear the textarea
        excludeDomains = [];  // Clear the exclude domains array
        table.search('');           // Clear any searches/filters on the DataTable
        table.columns().search(''); // Clear column specific searches if any
        table.draw();               // Redraw the table to its initial state
    });

    // Prevent sorting when interacting with inputs in DataTables header
    $('input', table.table().header()).on('click keyup', function(event) {
        event.stopPropagation();
    });

    // Event handler for text search inputs
    $('#seoDataTable thead tr:eq(1) th input[type="text"]').on('keyup change', function() {
        table.draw();
    });

    // Event handler for numeric range inputs
    $('#seoDataTable thead tr:eq(1) th input[type="number"]').on('keyup change', function() {
        table.draw(); // Redraw table to apply the custom search
    });

// Copy visible data from 'Placed On' column to clipboard or download Excel for large datasets
$('#copyButton').on('click', function() {
    var filters = {
        excludeDomains: excludeDomains,
        rdMin: $('#rdMin').val(),
        rdMax: $('#rdMax').val(),
        drMin: $('#drMin').val(),
        drMax: $('#drMax').val(),
        trafficMin: $('#trafficMin').val(),
        trafficMax: $('#trafficMax').val(),
        clientUrl: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(0).val(),
        rootDomain: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(1).val(),
        anchor: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(2).val(),
        niche: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(3).val(),
        placedLink: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(4).val(),
        placedOn: $('#seoDataTable thead tr:eq(1) th input[type="text"]').eq(5).val(),
        export_all: 'true'
    };

    // Log the filters to console for debugging
    console.log("Filters being sent to server:", filters);

    $.ajax({
        url: '/api/data',
        type: 'GET',
        data: filters,
        success: function(response) {
            let data = new Set(); // Use a Set to ensure unique values
            response.data.forEach(function(row) {
                if (row.placedon) {
                    data.add(row.placedon); // Add value to Set, which automatically handles duplicates
                }
            });
            let dataString = Array.from(data).join("\n");  // Convert Set to Array and join with newline character

            // Check if data is too large to copy to clipboard
            if (dataString.length > 100000) { // Adjust the threshold as needed
                // Create and download an Excel file
                var dataArray = Array.from(data).map(value => [value]);

                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.aoa_to_sheet([['Placed On'], ...dataArray]);
                XLSX.utils.book_append_sheet(wb, ws, 'SEO Data');

                var date = new Date();
                var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                XLSX.writeFile(wb, dateString + '-Seo-data.xlsx');

                $('#statusMessage').text('Data is too large to copy. Downloading as Excel file.').fadeOut(3000, function() {
                    $(this).text('');
                    $(this).show();
                });
            } else {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(dataString).then(function() {
                        $('#statusMessage').text('Data copied to clipboard successfully!').fadeOut(3000, function() {
                            $(this).text('');
                            $(this).show();
                        });
                    }, function(err) {
                        $('#statusMessage').text('Failed to copy data!').fadeOut(3000, function() {
                            $(this).text('');
                            $(this).show();
                        });
                    });
                } else {
                    // Fallback for browsers that do not support the Clipboard API
                    let textarea = $('<textarea>').val(dataString).appendTo('body').select();
                    document.execCommand('copy');
                    textarea.remove();
                    $('#statusMessage').text('Data copied to clipboard successfully!').fadeOut(3000, function() {
                        $(this).text('');
                        $(this).show();
                    });
                }
            }
        },
        error: function(xhr, status, error) {
            console.error('Failed to fetch data for copying:', status, error);
            console.error('Response from server:', xhr.responseText);
            $('#statusMessage').text('Failed to fetch data for copying!').fadeOut(3000, function() {
                $(this).text('');
                $(this).show();
            });
        }
    });
});


    // Paste button functionality
    $('#pasteButton').on('click', function() {
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(function(clipText) {
                console.log("Clipboard text:", clipText); // Debugging line to check clipboard text
                let existingData = $('#domainFilter').val().split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
                let newData = clipText.split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
                let combinedData = new Set([...existingData, ...newData]); // Combine and ensure unique values using Set
                $('#domainFilter').val(Array.from(combinedData).join('\n'));
                console.log("New value in textarea:", $('#domainFilter').val()); // Debugging line to check the new value
                $('#statusMessage').text('Data pasted successfully!').fadeOut(3000, function() {
                    $(this).text('');
                    $(this).show();
                });
            }).catch(function(err) {
                console.error("Error reading clipboard:", err); // Debugging line to log errors
                $('#statusMessage').text('Failed to paste data!').fadeOut(3000, function() {
                    $(this).text('');
                    $(this).show();
                });
            });
        } else {
            console.error("Clipboard API not supported in this browser."); // Debugging line for unsupported Clipboard API
            $('#statusMessage').text('Clipboard API not supported in this browser.').fadeOut(3000, function() {
                $(this).text('');
                $(this).show();
            });
        }
    });
});
