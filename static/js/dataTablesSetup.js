$(document).ready(function() {
    var excludeDomains = [];

    var table = $('#seoDataTable').DataTable({
        processing: true,
        serverSide: true,
        paging: true,
        searching: true,
        order: [[1, "asc"]],
        ajax: {
            url: "/api/data",
            type: 'GET',
            dataSrc: function(json) {
                return json.data;
            }
        },
        columns: [
            { data: "uploaddate", render: function(data, type, row) {
                if (type === 'display' || type === 'filter') {
                    var date = new Date(data);
                    var day = String(date.getDate()).padStart(2, '0');
                    var month = String(date.getMonth() + 1).padStart(2, '0');
                    var year = date.getFullYear();
                    return day + '/' + month + '/' + year;
                }
                return data;
            }},
            { data: "clienturl", render: function(data, type, row) {
                if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
                    return '<a href="' + data + '" target="_blank">' + data + '</a>';
                } else {
                    return data;
                }
            }},
            { data: "rootdomain" },
            { data: "anchor" },
            { data: "niche" },
            { data: "rd" },
            { data: "dr" },
            { data: "traffic" },
            { data: "placedlink", render: function(data, type, row) {
                if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
                    return '<a href="' + data + '" target="_blank">' + data + '</a>';
                } else {
                    return data;
                }
            }},
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

    // Filter by excluded domains
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        var placedLink = data[8].toLowerCase();
        return !excludeDomains.some(domain => placedLink.includes(domain));
    });

    // Custom range filtering functionality
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        var rdMin = parseFloat($('#rdMin').val()) || -Infinity;
        var rdMax = parseFloat($('#rdMax').val()) || Infinity;
        var drMin = parseFloat($('#drMin').val()) || -Infinity;
        var drMax = parseFloat($('#drMax').val()) || Infinity;
        var trafficMin = parseFloat($('#trafficMin').val()) || -Infinity;
        var trafficMax = parseFloat($('#trafficMax').val()) || Infinity;

        var rd = parseFloat(data[5]) || 0;
        var dr = parseFloat(data[6]) || 0;
        var traffic = parseFloat(data[7]) || 0;

        return (rd >= rdMin && rd <= rdMax) &&
               (dr >= drMin && dr <= drMax) &&
               (traffic >= trafficMin && traffic <= trafficMax);
    });

    // Handle domain exclusion form submission
    $('#domainExclusionMaterialForm').on('submit', function(e) {
        e.preventDefault();
        excludeDomains = $('#domainFilter').val().toLowerCase().split('\n').map(domain => domain.trim());
        table.draw();
    });

    // Reset button functionality
    $('#resetButton').click(function() {
        $('#domainFilter').val('');
        excludeDomains = [];
        table.search('');
        table.columns().search('');
        table.draw();
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

    // Event handler for numeric range inputs
    $('#seoDataTable thead tr:eq(1) th input[type="number"]').on('keyup change', function() {
        table.draw();
    });

    // Copy visible data from 'Placed On' column to clipboard
    $('#copyButton').on('click', function() {
        let data = new Set();
        table.column(9, { search: 'applied' }).data().each(function(value, index) {
            if (value) {
                data.add(value);
            }
        });
        let dataString = Array.from(data).join("\n");
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
            let existingData = $('#domainFilter').val().split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
            let newData = clipText.split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
            let combinedData = new Set([...existingData, ...newData]);
            $('#domainFilter').val(Array.from(combinedData).join('\n'));
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
