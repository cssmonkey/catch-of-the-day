var React = require('react');
var ReactDOM = require('react-dom');
var CSSTransitionGroup = require('react-addons-css-transition-group');

var ReactRouter =  require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Navigation = ReactRouter.Navigation;
var History = ReactRouter.History;
var createBrowserHistory = require('history/lib/createBrowserHistory');

var helpers = require('./helpers');

// Firebase
var Rebase = require('re-base');
var base = Rebase.createClass('https://catch-of-the-day-d7c40.firebaseio.com/');

var Catalyst = require('react-catalyst');

/*
  App
*/
var App = React.createClass({
  mixins: [Catalyst.LinkedStateMixin],
  getInitialState: function() {
    return {
      fishes: {},
      order: {}
    }
  },
  componentDidMount: function() {
      base.syncState(this.props.params.storeId + '/fishes', {
          context: this,
          state: 'fishes'
      });

      var localStorageRef = localStorage.getItem('order-' + this.props.params.storeId);

      if(localStorageRef) {
        this.setState({
          order: JSON.parse(localStorageRef)
        });
      }
  },
  componentWillUpdate: function(nextProps, nextState) {
    localStorage.setItem('order-' + this.props.params.storeId, JSON.stringify(nextState.order));
  },
  addToOrder: function(key) {
    this.state.order[key] = this.state.order[key] + 1 || 1;
    this.setState({order: this.state.order});
  },
  addFish: function(fish) {
    var timestamp = (new Date()).getTime();
    // update the state obj
    this.state.fishes['fish-' + timestamp] = fish;
    // set the state
    this.setState({ fishes: this.state.fishes });
  },
  removeFish: function(key) {
    if(confirm("Are you sure you want to remove this fish?")) {
        this.state.fishes[key] = null;
        this.setState({ fishes: this.state.fishes });
    }

  },
  removeFromOrder: function(key) {
      delete this.state.order[key];
      this.setState({ order: this.state.order});
  },
  loadSamples: function() {
    this.setState({
      fishes: require('./sample-fishes')
    });
  },
  renderFish: function(key) {
    return (
      <Fish key={key} index={key} details={this.state.fishes[key]} addToOrder={this.addToOrder} />
    )
  },
  render: function() {
    return (
      <div className="catch-of-the-day">
        <div className="menu">
          <Header tagline="Fresh Seafood Market" />
          <ul className="list-of-fishes">
            {Object.keys(this.state.fishes).map(this.renderFish)}
          </ul>
        </div>
        <Order fishes={this.state.fishes} order={this.state.order} removeFromOrder={this.removeFromOrder} />
        <Inventory addFish={this.addFish} loadSamples={this.loadSamples} fishes={this.state.fishes} linkState={this.linkState} removeFish={this.removeFish} />
      </div>
    )
  }
});

/*
 Fish
*/
var Fish = React.createClass({
  onButtonClick: function() {
    var key = this.props.index;
    this.props.addToOrder(key);
  },
  render: function() {
    var details = this.props.details;
    var isAvailable = (details.status === 'available' ? true : false);
    var buttonText = (isAvailable ? 'Add to order' : 'Sold out!');
    return (
      <li className="menu-fish">
        <img src={details.image} alt={details.name} />
        <h3 className="fish-name">
          {details.name} <span className="price">{helpers.formatPrice(details.price)}</span>
        </h3>
        <p>{details.desc}</p>
        <button disabled={!isAvailable} onClick={this.onButtonClick}>{buttonText}</button>
      </li>
    )
  }
});

/*
  Add Fish Form
*/
var AddFishForm = React.createClass({
  createFish: function(event) {
    event.preventDefault();

    var fish = {
      name: this.refs.name.value,
      price: this.refs.price.value,
      status: this.refs.status.value,
      desc: this.refs.desc.value,
      image: this.refs.image.value
    }

    this.props.addFish(fish);
    this.refs.fishForm.reset();
  },
  render: function() {
    return (
      <form className="fish-edit" ref="fishForm" onSubmit={this.createFish}>
        <input type="text" ref="name" placeholder="Fish Name" />
        <input type="text" ref="price" placeholder="Fish Price" />
        <select ref="status">
          <option value="available">Fresh!</option>
          <option value="unavailable">Sold Out!</option>
        </select>
        <textarea type="text" ref="desc" placeholder="Desc"></textarea>
        <input type="text" ref="image" placeholder="URL to Image" />
        <button type="submit">+ Add Item</button>
      </form>
    )
  }
});

/*
  Header
*/
var Header = React.createClass({
    render: function() {
        return (
            <header className="top">
                <h1>Catch
                    <span className="ofThe">
                    <span className="of">of</span>
                    <span className="the">the</span>
                    </span>
                    Day</h1>
                <h3 className="tagline"><span>{this.props.tagline}</span></h3>
            </header>
        )
    },
    propTypes: {
        tagline: React.PropTypes.string.isRequired
    }
});

/*
  Order
*/
var Order = React.createClass({
  renderOrder: function(key) {
      var fish = this.props.fishes[key];
      var count = this.props.order[key];
      var removeBtn = <button onClick={this.props.removeFromOrder.bind(null, key)}>&times;</button>;

      if(!fish) {
          return <li key={key}>Sorry, fish no longer available! {removeBtn}</li>
      }

      return (
          <li key={key}>
            <span>
                <CSSTransitionGroup component="span" transitionName="count" transitionEnterTimeout={250} transitionLeaveTimeout={250}>
                    <span key={count}>{count}</span>
                </CSSTransitionGroup>
                lbs {fish.name} {removeBtn}
            </span>
            <span className="price">{helpers.formatPrice(count * fish.price)}</span>
          </li>
      )
  },
  render: function() {
    var orderIds = Object.keys(this.props.order);
    var total = orderIds.reduce((prevTotal, key) =>{
        var fish = this.props.fishes[key];
        var count = this.props.order[key];
        var isAvailable = fish && fish.status === 'available';

        if(fish && isAvailable) {
            return prevTotal + (count * parseInt(fish.price) || 0);
        }

        return prevTotal;
    }, 0);
    return (
      <div className="order-wrap">
        <h2 className="order-title">Your order</h2>
        <CSSTransitionGroup className="order" component="ul" transitionName="order" transitionEnterTimeout={500} transitionLeaveTimeout={500}>
            {orderIds.map(this.renderOrder)}
            <li className="total">
                <strong>Total:</strong>
                {helpers.formatPrice(total)}
            </li>
        </CSSTransitionGroup>
      </div>
    )
  }
});

/*
  Inventory
*/
var Inventory = React.createClass({
  renderInventory: function(key) {
    var linkState = this.props.linkState;
    return(
      <div className="fish-edit" key={key}>
        <input type="text" valueLink={linkState('fishes.' + key + '.name')}/>
        <input type="text" valueLink={linkState('fishes.' + key + '.price')}/>
        <select valueLink={linkState('fishes.' + key + '.status')}>
          <option value="unavailable">Sold out!</option>
          <option value="available">Fresh!</option>
        </select>
        <textarea valueLink={linkState('fishes.' + key + '.desc')}></textarea>
        <input type="text" valueLink={linkState('fishes.' + key + '.image')}/>
        <button onClick={this.props.removeFish.bind(null, key)}>Remove fish</button>
      </div>
    )
  },
  render: function() {
    return (
      <div>
        <h2>Inventory</h2>
        {Object.keys(this.props.fishes).map(this.renderInventory)}
        <AddFishForm {...this.props} />
        <button onClick={this.props.loadSamples}>Load Sample Fishes</button>
      </div>
    )
  }
});


/*
  StorePicker
  This will let us make <StorePicker/>
*/
var StorePicker = React.createClass({
  mixins: [History],
  goToStore: function(event) {
    event.preventDefault();
    // get the data from the input
    var storeId = this.refs.storeId.value;

    // Transisition from StorePicker to App
    this.history.pushState(null, '/store/' + storeId);
  },
  render: function() {
    return (
      <form className="store-selector" onSubmit={this.goToStore}>
        <h2>Please enter a store</h2>
        <input type="text" ref="storeId" defaultValue={helpers.getFunName()} required />
        <input type="submit" value="submit" />
      </form>
    )
  }
});


/*
  Not Found
*/
var NotFound = React.createClass({
  render: function() {
    return <h1>Not found!</h1>
  }
});


/*
  Routes
*/
var routes = (
  <Router history={createBrowserHistory()}>
    <Route path="/" component={StorePicker} />
    <Route path="/store/:storeId" component={App} />
    <Route path="*" component={NotFound} />
  </Router>
);


ReactDOM.render(routes, document.querySelector('#main'));
