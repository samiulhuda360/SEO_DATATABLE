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
                customize: function(xlsx) {
                    var sheet = xlsx.xl.worksheets['sheet1.xml'];
                    $('row:first', sheet).remove();
                    var headers = '<row r="1">' +
                        '<c t="inlineStr" r="A1"><is><t>Date</t></is></c>' +
                        '<c t="inlineStr" r="B1"><is><t>Client URL</t></is></c>' +
                        '<c t="inlineStr" r="C1"><is><t>Root Domain</t></is></c>' +
                        '<c t="inlineStr" r="D1"><is><t>Anchor</t></is></c>' +
                        '<c t="inlineStr" r="E1"><is><t>Niche</t></is></c>' +
                        '<c t="inlineStr" r="F1"><is><t>RD</t></is></c>' +
                        '<c t="inlineStr" r="G1"><is><t>DR</t></is></c>' +
                        '<c t="inlineStr" r="H1"><is><t>Traffic</t></is></c>' +
                        '<c t="inlineStr" r="I1"><is><t>Placed Link</t></is></c>' +
                        '<c t="inlineStr" r="J1"><is><t>Placed On</t></is></c>' +
                        '</row>';
                    sheet.childNodes[0].childNodes[1].innerHTML = headers + sheet.childNodes[0].childNodes[1].innerHTML;
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
                customize: function(csv) {
                    var headers = 'Date,Client URL,Root Domain,Anchor,Niche,RD,DR,Traffic,Placed Link,Placed On\n';
                    return headers + csv;
                }
            }
        ]
    });

    // Handle domain exclusion form submission
    $('#domainExclusionMaterialForm').on('submit', function(e) {
        e.preventDefault();
        excludeDomains = $('#domainFilter').val().toLowerCase().split('\n').map(domain => domain.trim());
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

    // Initialize Clipboard.js for copy button
    new ClipboardJS('#copyButton', {
        text: function() {
            let data = new Set();
            table.column(9, { search: 'applied' }).data().each(function(value) {
                if (value) {
                    data.add(value);
                }
            });
            return Array.from(data).join("\n");
        }
    }).on('success', function() {
        $('#statusMessage').text('Data copied to clipboard successfully!').fadeOut(3000, function() {
            $(this).text('');
            $(this).show();
        });
    }).on('error', function() {
        $('#statusMessage').text('Failed to copy data!').fadeOut(3000, function() {
            $(this).text('');
            $(this).show();
        });
    });

 
    // Manual paste functionality
    $('#pasteButton').on('click', function() {
        let textarea = $('<textarea>').appendTo('body').focus();
        document.execCommand('paste');
        let clipText = textarea.val();
        textarea.remove();

        let existingData = $('#domainFilter').val().split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
        let newData = clipText.split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
        let combinedData = new Set([...existingData, ...newData]);
        $('#domainFilter').val(Array.from(combinedData).join('\n'));
        $('#statusMessage').text('Data pasted successfully!').fadeOut(3000, function() {
            $(this).text('');
            $(this).show();
        });
    });
});
