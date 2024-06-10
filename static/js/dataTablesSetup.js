$(document).ready(function() {
    var excludeDomains = []; // Array to hold the domains to exclude

    var table = $('#seoDataTable').DataTable({
        paging: true,
        searching: true,
        order: [[1, "asc"]],
        ajax: {
            url: "/api/data",
            dataSrc: ""
        },
        columns: [
            {data: "uploaddate",
                render: function(data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        var date = new Date(data); // Assuming 'data' is the serial date or timestamp
                        var day = String(date.getDate()).padStart(2, '0');
                        var month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
                        var year = date.getFullYear();
                        return day + '/' + month + '/' + year; // Format to "dd/mm/yyyy"
                    }
                    return data; // Use raw data for other types like sorting or type detection
                }
            },
            {data: "clienturl",
                render: function(data, type, row) {
                    if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
                        return '<a href="' + data + '" target="_blank">' + data + '</a>';
                    } else {
                        return data;
                    }
                }
            },
            {data: "rootdomain"},
            {data: "anchor"},
            {data: "niche"},
            {data: "rd"},
            {data: "dr"},
            {data: "traffic"},
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
            {data: "placedon"}
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excelHtml5',
                title: null,  // Ensure no title row is added to the export file
                filename: function() {
                    var date = new Date();
                    var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                    return dateString + '-Seo-data';  // e.g., '2024-6-29-Seo-data'
                },
                customize: function(xlsx) {
                    var sheet = xlsx.xl.worksheets['sheet1.xml'];
                    // Insert headers into the first row
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
                title: null,  // Ensure no title row is added to the export file
                filename: function() {
                    var date = new Date();
                    var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                    return dateString + '-Seo-data';  // e.g., '2024-6-29-Seo-data'
                },
                customize: function(csv) {
                    var headers = 'Date,Client URL,Root Domain,Anchor,Niche,RD,DR,Traffic,Placed Link,Placed On\n';
                    return headers + csv;
                }
            }
        ]
    });

     // Reset button functionality
     $('#resetButton').click(function() {
        $('#domainFilter').val('');  // Clear the textarea
        table.search('');           // Clear any searches/filters on the DataTable
        table.columns().search(''); // Clear column specific searches if any
        table.draw();               // Redraw the table to its initial state
    });

    // Handle domain exclusion form submission
    $('#domainExclusionForm').on('submit', function(e) {
        e.preventDefault();
        excludeDomains = $('#domainFilter').val().toLowerCase().split('\n').map(domain => domain.trim());
        table.draw(); // Trigger a redraw to apply the new exclusion filter
    });

    // Add custom search function to DataTables to exclude multiple domains
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        var placedLink = data[7].toLowerCase(); // 'Placed Link' is assumed to be the eighth column
        return !excludeDomains.some(domain => placedLink.includes(domain));
    });

    // Prevent sorting when interacting with inputs in DataTables header
    $('input', table.table().header()).on('click keyup', function(event) {
        event.stopPropagation();
    });

    // Event handler for text search inputs
    $('#seoDataTable thead tr:eq(1) th input[type="text"]').on('keyup change', function() {
        let columnIndex = $(this).closest('th').index();
        table.column(columnIndex).search(this.value).draw();
    });

    // Custom range filtering functionality for numeric inputs
    $('#seoDataTable thead tr:eq(1) th input[type="number"]').on('keyup change', function() {
        table.draw(); // Redraw table to apply the custom search
    });
    
     // Copy visible data from 'Placed On' column to clipboard
     $('#copyButton').on('click', function() {
        let data = [];
        table.column(9, { search: 'applied' }).data().each(function(value, index) {
            if (value) {
                data.push(value);  // Collect only non-empty values
            }
        });
        let dataString = data.join("\n");  // Join data with newline character
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
    });

    // Paste data from clipboard to 'domainFilter'
    $('#pasteButton').on('click', function() {
        navigator.clipboard.readText().then(function(clipText) {
            $('#domainFilter').val(clipText);
            $('#statusMessage').text('Data pasted successfully!').fadeOut(3000, function() {
                $(this).text('');
                $(this).show();
            });
        }).catch(function(err) {
            $('#statusMessage').text('Failed to paste data!').fadeOut(3000, function() {
                $(this).text('');
                $(this).show();
            });
        });
    });
});
